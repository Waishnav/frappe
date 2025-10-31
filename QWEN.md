# QWEN.md: Expert Frappe Framework Development Guide

This is a comprehensive guide for agentic coding agents acting as expert Frappe Framework developers. You are assumed to be deeply familiar with this codebase and framework architecture.

## Framework Architecture Overview

### Core Framework Components
- **Core Layer**: `frappe/core/` - Document types, user management, permissions, system settings
- **Model Layer**: `frappe/model/` - ORM, document handling, database operations, workflows
- **API Layer**: `frappe/api/` - REST API endpoints, version management (v1/v2)
- **Client Layer**: `frappe/client.py` - API client functions for frontend
- **Handler Layer**: `frappe/handler.py` - Request processing, authentication, routing
- **Utilities**: `frappe/utils/` - Helper functions, validators, formatters, data processing

### API Architecture
- **REST APIs**: Two-tier system with v1 (backward compatible) and v2 (modern) endpoints
- **Method APIs**: `@frappe.whitelist()` decorator exposes Python functions as HTTP endpoints
- **Resource APIs**: `/api/resource/{doctype}` for CRUD operations on document types
- **Client-side APIs**: JavaScript functions in `frappe.call()`, `frappe.model.*`, `frappe.ui.*`

## Precise Search Strategies

### Finding API Endpoints
```bash
# Find all whitelisted API methods
grep -r "@frappe\.whitelist" --include="*.py"

# Find specific API versions
grep -r "def.*(" frappe/api/v1.py frappe/api/v2.py

# Find client.py API functions
grep -r "def " frappe/client.py

# Find handler endpoints
grep -r "def.*(" frappe/handler.py
```

### Finding JavaScript APIs
```bash
# Core frontend APIs
grep -r "frappe\.(call|model|ui)" --include="*.js" frappe/public/js/

# Form/Document APIs
grep -r "frappe\.model\." --include="*.js"

# UI component APIs
grep -r "frappe\.ui\." --include="*.js"

# Client-side method calls
grep -r "frappe\.call" --include="*.js"
```

### Finding Utilities & Helpers
```bash
# Validation functions
find frappe/utils/ -name "*.py" -exec grep -l "def.*validate" {} \;

# Data formatters
find frappe/utils/ -name "*.py" -exec grep -l "def.*format" {} \;

# Database utilities
find frappe/model/utils/ -name "*.py"

# Email utilities
find frappe/email/ -name "*.py" -exec grep -l "def " {} \;
```

### Finding Document Types & Business Logic
```bash
# Find doctype controllers
find frappe/*/doctype/ -name "*.py" -not -name "test_*" -not -name "__init__*"

# Find specific doctype
find . -path "*/doctype/{doctype_name}/*" -name "*.py"

# Find doctype hooks and overrides
grep -r "def.*before_\|def.*after_\|def.*validate" --include="*.py" frappe/*/doctype/
```

## Framework-Specific Development Patterns

### Document Lifecycle Hooks
- **Before**: `before_insert`, `before_save`, `before_submit`, `before_cancel`
- **After**: `after_insert`, `after_save`, `after_submit`, `after_cancel`
- **Validation**: `validate()` method in document controllers
- **Permission**: `has_permission()` method for custom permission logic

### Common Implementation Patterns

#### Custom API Methods
```python
@frappe.whitelist()
def my_custom_method(param1, param2):
    # Always validate permissions first
    frappe.has_permission("DocType", "read")
    # Process and return data
    return {"result": "data"}
```

#### Document Controllers
```python
class MyDocType(Document):
    def validate(self):
        # Custom validation logic

    def before_save(self):
        # Pre-save processing

    def after_insert(self):
        # Post-creation actions
```

#### Client-side Integration
```javascript
// API calls from frontend
frappe.call({
    method: "path.to.method",
    args: {param: value},
    callback: function(r) {
        // Handle response
    }
});

// Model operations
frappe.model.get_doc(doctype, name);
frappe.model.set_value(doctype, name, field, value);
```

### Database & ORM Patterns
- **Query Builder**: `frappe.qb` for complex queries
- **Raw Queries**: `frappe.db.sql()` for direct database access
- **ORM Methods**: `frappe.get_doc()`, `frappe.get_list()`, `frappe.get_all()`
- **Bulk Operations**: `frappe.db.bulk_insert()`, batch processing patterns

### Error Handling & Exceptions
- **Standard Exceptions**: Use `frappe.exceptions.*` (ValidationError, PermissionError, etc.)
- **API Errors**: Always set `http_status_code` for API responses
- **User Messages**: Use `frappe.msgprint()`, `frappe.throw()` for user feedback

## Codebase Navigation Mastery

### Directory Structure Deep Dive
```
frappe/
├── api/           # REST API endpoints (v1, v2, utils)
├── core/          # Core framework (users, roles, system settings)
│   ├── doctype/   # Core document types (User, Role, etc.)
│   └── api/       # Core API methods
├── model/         # ORM and document handling
│   ├── utils/     # Database utilities, user settings
│   └── document.py # Base Document class
├── utils/         # Framework utilities (60+ utility modules)
├── desk/          # Desktop interface components
├── website/       # Website/portal functionality
├── email/         # Email system and templates
├── integrations/  # Third-party integrations
├── public/js/     # Frontend JavaScript framework
└── www/           # Web pages and forms
```

### Key Files for Framework Understanding
- `frappe/__init__.py` - Core framework initialization and globals
- `frappe/app.py` - WSGI application setup
- `frappe/boot.py` - Application bootstrapping
- `frappe/hooks.py` - Framework hooks and configuration
- `frappe/handler.py` - Request handling and routing
- `frappe/client.py` - API client functions
- `frappe/permissions.py` - Permission system core

### Search Patterns for Common Tasks

#### Authentication & Permissions
```bash
grep -r "frappe\.has_permission\|@frappe\.whitelist" --include="*.py"
find frappe/core/doctype/user/ -name "*.py"
grep -r "def.*permission" frappe/permissions.py
```

#### Database Operations
```bash
grep -r "frappe\.db\." --include="*.py" | head -20
find frappe/model/ -name "*.py" -exec grep -l "def.*get_\|def.*set_" {} \;
grep -r "frappe\.qb" --include="*.py"
```

#### Email & Notifications
```bash
find frappe/email/ -name "*.py"
grep -r "send_email\|send_notification" --include="*.py"
```

#### Reports & Analytics
```bash
find frappe/*/report/ -name "*.py"
grep -r "def.*execute" --include="*.py" frappe/*/report/
```

#### Workflows & Automation
```bash
find frappe/workflow/ -name "*.py"
grep -r "before_workflow\|after_workflow" --include="*.py"
```

## Advanced Framework Knowledge

### Performance Optimization
- **Caching**: Use `frappe.cache()` for application caching
- **Background Jobs**: `frappe.enqueue()` for async processing
- **Database**: Query optimization, indexing strategies
- **Frontend**: Lazy loading, efficient DOM updates

### Integration Patterns
- **Webhooks**: Outgoing HTTP calls on document events
- **REST API**: Full CRUD operations with filtering and pagination
- **SSO/OAuth**: Authentication integration patterns
- **File Handling**: Upload, storage, and serving strategies

### Testing Strategies
- **Unit Tests**: `frappe/tests/` for framework tests
- **DocType Tests**: `test_*.py` in each doctype folder
- **API Tests**: `frappe/tests/test_api.py` and `test_api_v2.py`
- **Frontend Tests**: Cypress integration tests in `cypress/`

## Code Style & Development Standards

### Python Conventions
- **Imports**: Absolute imports, grouped (stdlib, third-party, local)
- **Formatting**: Tabs (size 4), line length 99, LF endings
- **Type Hints**: Required for all public functions
- **Docstrings**: Triple quotes, document params and return types
- **Error Handling**: Specific exception types, meaningful messages

### JavaScript Conventions
- **ES2022**: Modern JavaScript features
- **Framework APIs**: Prefer `frappe.*` over direct DOM manipulation
- **Async/Await**: For API calls and async operations
- **Error Handling**: Proper try/catch and user feedback

### Commit Standards
- **Messages**: Action-oriented, explain the "why" not "what"
- **Pre-commit**: Enforced linting, formatting, security checks
- **Testing**: Always run tests before commits

## Expert Tips for Accurate Development

1. **Always check existing patterns** before implementing new features
2. **Use the Task tool** for complex searches across the large codebase
3. **Reference hooks.py** to understand framework extension points
4. **Check both Python and JS sides** for complete feature implementation
5. **Validate permissions early** in any custom API or method
6. **Follow the document lifecycle** for proper business logic placement
7. **Use framework utilities** instead of reinventing common functionality

---
**Framework Documentation**: https://docs.frappe.io/llm/framework.txt
**API Reference**: Check `frappe/api/__init__.py` for API architecture
**Core Modules**: Always reference `frappe/__init__.py` for available globals
