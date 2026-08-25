/**
 * Global Enterprise Error Formatter.
 * Translates API error responses, validation errors, and network issues
 * into clean, professional, human-readable user messages.
 */

export const formatErrorMessage = (err: any, fallbackMessage: string = 'An unexpected error occurred. Please try again.'): string => {
  if (!err) return fallbackMessage;

  // If already a plain string
  if (typeof err === 'string') {
    return cleanRawText(err);
  }

  // Network / Connection Error
  if (err.isNetworkError || err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Unable to connect to the server. Please verify your network connection and ensure the server is running.';
  }

  // HTTP Status Code Specific Defaults
  const status = err.status || err.response?.status;
  if (status === 401) {
    const detail = err.response?.data?.detail || err.data?.detail || err.message;
    if (detail && typeof detail === 'string' && detail.toLowerCase().includes('token')) {
      return 'Your session has expired. Please log in again to continue.';
    }
    return 'Invalid username or password. Please verify your login credentials.';
  }

  if (status === 403) {
    return 'Access Denied: You do not have permission to perform this action. Please contact your system administrator.';
  }

  if (status === 404) {
    return 'The requested record or resource was not found. It may have been archived or deleted.';
  }

  if (status === 405) {
    return 'This action is not permitted for the selected record.';
  }

  if (status >= 500) {
    return 'A server processing error occurred. Please try again or contact system support.';
  }

  // Extract from Axios / Custom Error payload
  const data = err.response?.data || err.data;

  if (data) {
    if (typeof data === 'string') {
      return cleanRawText(data);
    }

    // Direct detail field
    if (data.detail && typeof data.detail === 'string') {
      return cleanRawText(data.detail);
    }

    // Direct error field
    if (data.error && typeof data.error === 'string') {
      return cleanRawText(data.error);
    }

    // non_field_errors
    if (data.non_field_errors) {
      const nfe = data.non_field_errors;
      if (Array.isArray(nfe)) {
        return cleanRawText(nfe.join(' '));
      }
      if (typeof nfe === 'string') {
        return cleanRawText(nfe);
      }
    }

    // Key-value field errors (e.g. { "amount": ["Must be > 0"], "date": ["Required"] })
    if (typeof data === 'object') {
      const fieldMessages = Object.entries(data)
        .filter(([key]) => key !== 'status_code' && key !== 'raw_errors')
        .map(([field, msgs]) => {
          const fieldLabel = field
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          let text = '';
          if (Array.isArray(msgs)) {
            text = msgs.map((m) => (typeof m === 'object' ? JSON.stringify(m) : String(m))).join(', ');
          } else if (typeof msgs === 'object' && msgs !== null) {
            text = JSON.stringify(msgs);
          } else {
            text = String(msgs);
          }
          return `${fieldLabel}: ${cleanRawText(text)}`;
        });

      if (fieldMessages.length > 0) {
        return fieldMessages.join(' | ');
      }
    }
  }

  // Fallback to error.message if present and clean
  if (err.message && typeof err.message === 'string') {
    if (err.message.includes('status code')) {
      return fallbackMessage;
    }
    return cleanRawText(err.message);
  }

  return fallbackMessage;
};

/**
 * Strips python brackets, quotes, and technical symbols from raw text.
 */
function cleanRawText(text: string): string {
  if (!text) return '';
  let s = text.trim();
  // Strip outer quotes and brackets: ['...'] or ("...",)
  s = s.replace(/^\[\s*['"]?/, '').replace(/['"]?\s*\]$/, '');
  s = s.replace(/^\(\s*['"]?/, '').replace(/['"]?\s*\)$/, '');
  s = s.replace(/^['"]|['"]$/g, '');
  return s.trim();
}
