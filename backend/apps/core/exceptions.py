"""
Centralized Exception Handling & Human-Friendly Business Error Translation.
Formats all backend Django/DRF exceptions into clean, professional user-facing messages.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import ProtectedError
import re


def _clean_error_message(msg: str) -> str:
    """Removes python brackets, quotes, and technical symbols from error strings."""
    if not msg:
        return "An unexpected validation error occurred."
    s = str(msg).strip()
    # Strip ['...'] or ("...",)
    s = re.sub(r"^\s*\[\s*['\"]?", "", s)
    s = re.sub(r"['\"]?\s*\]\s*$", "", s)
    s = re.sub(r"^\s*\(\s*['\"]?", "", s)
    s = re.sub(r"['\"]?\s*\)\s*$", "", s)
    s = s.strip().strip("'\"")
    return s


def custom_exception_handler(exc, context):
    """
    Transforms any DRF/Django exception into a consistent, professional,
    user-facing error payload: { "detail": "...", "status_code": ... }
    """
    response = exception_handler(exc, context)

    if response is None and isinstance(exc, DjangoValidationError):
        if hasattr(exc, "message_dict"):
            messages = []
            for field, err_list in exc.message_dict.items():
                field_label = field.replace("_", " ").title()
                cleaned_errs = ", ".join([_clean_error_message(e) for e in err_list])
                messages.append(f"{field_label}: {cleaned_errs}")
            clean_msg = " | ".join(messages)
        elif hasattr(exc, "messages"):
            clean_msg = " ".join([_clean_error_message(m) for m in exc.messages])
        else:
            clean_msg = _clean_error_message(str(exc))

        return Response(
            {"detail": clean_msg, "error": clean_msg, "status_code": 400},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if response is None and isinstance(exc, ProtectedError):
        clean_msg = "Cannot delete this record because it is referenced in other active transactions or documents."
        return Response(
            {"detail": clean_msg, "error": clean_msg, "status_code": 400},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if response is not None:
        data = response.data
        status_code = response.status_code

        if status_code == 401:
            clean_msg = "Invalid username or password. Please verify your login credentials."
            if isinstance(data, dict) and "detail" in data and "given token not valid" in str(data["detail"]).lower():
                clean_msg = "Your session has expired. Please log in again to continue."
        elif status_code == 403:
            clean_msg = "Access Denied: You do not have permission to perform this action. Please contact your system administrator."
        elif status_code == 404:
            clean_msg = "The requested record was not found or may have been removed."
        elif status_code == 405:
            clean_msg = "This action is not permitted for the selected record."
        elif isinstance(data, dict):
            if "detail" in data and isinstance(data["detail"], str):
                clean_msg = _clean_error_message(data["detail"])
            elif "non_field_errors" in data:
                errs = data["non_field_errors"]
                clean_msg = " ".join([_clean_error_message(e) for e in err_list]) if isinstance(errs, list) else _clean_error_message(errs)
            elif "error" in data and isinstance(data["error"], str):
                clean_msg = _clean_error_message(data["error"])
            else:
                messages = []
                for field, errs in data.items():
                    field_label = field.replace("_", " ").title()
                    if isinstance(errs, list):
                        msg = ", ".join([_clean_error_message(e) for e in errs])
                    else:
                        msg = _clean_error_message(str(errs))
                    messages.append(f"{field_label}: {msg}")
                clean_msg = " | ".join(messages) if messages else "Invalid data provided. Please check the form."
        elif isinstance(data, list):
            clean_msg = " ".join([_clean_error_message(e) for e in data])
        else:
            clean_msg = _clean_error_message(str(data))

        response.data = {
            "detail": clean_msg,
            "error": clean_msg,
            "status_code": status_code,
            "raw_errors": data if isinstance(data, dict) else None,
        }

    return response
