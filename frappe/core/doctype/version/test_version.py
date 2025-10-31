# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: MIT. See LICENSE
import copy
import json

import frappe
from frappe.core.doctype.version.version import get_diff
from frappe.tests import IntegrationTestCase, UnitTestCase
from frappe.tests.utils import make_test_objects


class UnitTestVersion(UnitTestCase):
	"""
	Unit tests for Version.
	Use this class for testing individual functions and methods.
	"""

	pass


class TestVersion(IntegrationTestCase):
	def test_get_diff(self):
		frappe.set_user("Administrator")
		test_records = make_test_objects("Event", reset=True)
		old_doc = frappe.get_doc("Event", test_records[0])
		new_doc = copy.deepcopy(old_doc)

		old_doc.color = None
		new_doc.color = "#fafafa"

		diff = get_diff(old_doc, new_doc)["changed"]

		self.assertEqual(get_fieldnames(diff)[0], "color")
		self.assertTrue(get_old_values(diff)[0] is None)
		self.assertEqual(get_new_values(diff)[0], "#fafafa")

		new_doc.starts_on = "2017-07-20"

		diff = get_diff(old_doc, new_doc)["changed"]

		self.assertEqual(get_fieldnames(diff)[1], "starts_on")
		self.assertEqual(get_old_values(diff)[1], "01-01-2014 00:00:00")
		self.assertEqual(get_new_values(diff)[1], "07-20-2017 00:00:00")

	def test_no_version_on_new_doc(self):
		from frappe.desk.form.load import get_versions

		t = frappe.get_doc(doctype="ToDo", description="something")
		t.save(ignore_version=False)

		self.assertFalse(get_versions(t))

		t = frappe.get_doc(t.doctype, t.name)
		t.description = "changed"
		t.save(ignore_version=False)
		self.assertTrue(get_versions(t))

	def test_child_table_blank_strings_not_tracked(self):
		frappe.set_user("Administrator")
		event = frappe.get_doc(
			{
				"doctype": "Event",
				"subject": "Version Diff Test",
				"starts_on": "2025-01-01 10:00:00",
				"ends_on": "2025-01-01 11:00:00",
				"event_type": "Public",
				"color": "#abcdef",
				"event_participants": [
					{
						"reference_doctype": "User",
						"reference_docname": "Administrator",
					}
				],
			}
		).insert()

		self.addCleanup(
			lambda: frappe.delete_doc(
				"Event", event.name, ignore_permissions=True, delete_permanently=True
			)
		)

		frappe.db.delete("Version", {"ref_doctype": "Event", "docname": event.name})

		doc_dict = copy.deepcopy(event.as_dict())
		doc_dict["subject"] = "Version Diff Test - Updated"
		doc_dict["event_participants"][0]["email"] = ""

		updated_event = frappe.get_doc(doc_dict)
		updated_event.save()

		version = frappe.get_all(
			"Version",
			fields=["name", "data"],
			filters={"ref_doctype": "Event", "docname": event.name},
			order_by="creation desc",
			limit=1,
		)[0]

		version_data = json.loads(version["data"])
		self.assertIn(
			"subject",
			[field_change[0] for field_change in version_data.get("changed", [])],
		)
		row_changes = version_data.get("row_changed") or []
		self.assertTrue(
			all(
				all(field_change[0] != "email" for field_change in row[3]) for row in row_changes
			)
		)

	def test_numeric_string_equivalence_not_tracked(self):
		frappe.set_user("Administrator")
		event = frappe.get_doc(
			{
				"doctype": "Event",
				"subject": "Numeric Version Diff Test",
				"starts_on": "2025-02-01 09:00:00",
				"ends_on": "2025-02-01 10:00:00",
				"event_type": "Public",
				"color": "6",
			}
		).insert()

		self.addCleanup(
			lambda: frappe.delete_doc(
				"Event", event.name, ignore_permissions=True, delete_permanently=True
			)
		)

		frappe.db.delete("Version", {"ref_doctype": "Event", "docname": event.name})

		doc_dict = copy.deepcopy(event.as_dict())
		doc_dict["color"] = 6

		updated_event = frappe.get_doc(doc_dict)
		updated_event.save()

		versions = frappe.get_all(
			"Version",
			filters={"ref_doctype": "Event", "docname": event.name},
		)
		self.assertFalse(versions)


def get_fieldnames(change_array):
	return [d[0] for d in change_array]


def get_old_values(change_array):
	return [d[1] for d in change_array]


def get_new_values(change_array):
	return [d[2] for d in change_array]
