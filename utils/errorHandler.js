// Error handling utilities for consistent error management across the app

export const showErrorAlert = (message) => {
  // For now, use alert - can be replaced with a toast notification later
  alert(`Error: ${message}`);
  console.error('Error:', message);
};

export const showSuccessAlert = (message) => {
  // For now, use alert - can be replaced with a toast notification later
  alert(`Success: ${message}`);
  console.log('Success:', message);
};

export const showWarningAlert = (message) => {
  alert(`Warning: ${message}`);
  console.warn('Warning:', message);
};

export const showInfoAlert = (message) => {
  alert(`Info: ${message}`);
  console.info('Info:', message);
};

// Error categorization helper
export const categorizeError = (error) => {
  if (!error) return 'unknown';
  
  const errorMessage = error.message || error.toString().toLowerCase();
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'network';
  } else if (errorMessage.includes('server') || errorMessage.includes('500')) {
    return 'server';
  } else if (errorMessage.includes('validation') || errorMessage.includes('required')) {
    return 'validation';
  } else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
    return 'auth';
  }
  
  return 'unknown';
};

// Enhanced error handler with categorization
export const handleError = (error, context = '') => {
  const category = categorizeError(error);
  const message = error.message || error.toString();
  
  console.error(`Error in ${context}:`, {
    message,
    category,
    error
  });
  
  // Show user-friendly message based on category
  switch (category) {
    case 'network':
      showErrorAlert('Network error. Please check your internet connection.');
      break;
    case 'server':
      showErrorAlert('Server error. Please try again later.');
      break;
    case 'validation':
      showErrorAlert(message);
      break;
    case 'auth':
      showErrorAlert('Authentication error. Please log in again.');
      break;
    default:
      showErrorAlert('An unexpected error occurred. Please try again.');
  }
};
