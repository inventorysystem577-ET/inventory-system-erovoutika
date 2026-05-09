import React, { useState } from 'react';
import { Plus, X, Check, AlertCircle } from 'lucide-react';

const CategoryManager = ({ 
  darkMode, 
  onAddCategory, 
  existingCategories = [],
  title = "Manage Categories"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous states
    setError('');
    setSuccess(false);
    
    // Validation
    if (!newCategory.trim()) {
      setError('Please enter a category name');
      return;
    }
    
    if (existingCategories.includes(newCategory.trim())) {
      setError('This category already exists');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onAddCategory(newCategory.trim());
      setSuccess(true);
      setNewCategory('');
      
      // Close modal after success
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNewCategory('');
    setError('');
    setSuccess(false);
    setIsOpen(false);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
          darkMode
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
            : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-500/25'
        }`}
      >
        <Plus className="w-4 h-4" />
        Add Category
      </button>
    );
  }

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${
        darkMode ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-50'
      }`}
      onClick={handleBackdropClick}
    >
      <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-800 border border-gray-700 text-white' 
          : 'bg-white border border-gray-200 text-gray-900'
      } ${success ? 'scale-105' : 'scale-100'}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {success ? (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            ) : (
              <Plus className="w-5 h-5 text-blue-500" />
            )}
            {title}
          </h3>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className={`p-1 rounded-lg transition-colors ${
              darkMode
                ? 'hover:bg-gray-700 text-gray-400 disabled:opacity-50'
                : 'hover:bg-gray-100 text-gray-600 disabled:opacity-50'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                New Category Name
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setError('');
                }}
                placeholder="Enter category name"
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
                autoFocus
                disabled={isSubmitting}
              />
              {error && (
                <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            {existingCategories.length > 0 && (
              <div className="mb-6">
                <p className={`text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Existing Categories:
                </p>
                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                  {existingCategories.map((category, index) => (
                    <span
                      key={index}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:opacity-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newCategory.trim() || isSubmitting}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 ${
                  darkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-500/25'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Category
                  </div>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-green-600 font-medium">Category added successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManager;
