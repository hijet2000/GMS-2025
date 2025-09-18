import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { SparklesIcon } from './icons';

interface AskAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: any;
  // FIX: Added 'day' to the dateRange type to match the possible values from the Dashboard page.
  dateRange: 'day' | 'week' | 'month';
}

const AskAIModal: React.FC<AskAIModalProps> = ({ isOpen, onClose, dashboardData, dateRange }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when modal is opened
    if (isOpen) {
      setQuestion('');
      setResponse('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleAskAI = async () => {
    if (!question.trim()) {
      setError('Please enter a question.');
      return;
    }

    setIsLoading(true);
    setResponse('');
    setError(null);

    const displayDateRange = dateRange === 'day' ? 'today' : `this ${dateRange}`;

    const prompt = `
      You are a helpful business analyst for a vehicle repair workshop.
      Analyze the following JSON data which represents the workshop's performance for ${displayDateRange}.
      Provide a concise and insightful answer to the user's question based ONLY on the data provided.
      Do not make up information. If the data doesn't support an answer, say so.
      Format your response clearly.

      Here is the data:
      ${JSON.stringify(dashboardData, null, 2)}

      User's question: "${question}"
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      const text = result.text;
      setResponse(text);
    } catch (err) {
      console.error('Gemini API call failed:', err);
      setError('Sorry, something went wrong while fetching insights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const displayDateRange = dateRange === 'day' ? 'today' : `this ${dateRange}`;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
             <div className="text-purple-600"> <SparklesIcon /></div>
          </div>
          <div>
            <h2 id="ai-modal-title" className="text-xl font-bold text-gray-900">Ask AI about your Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">Get instant insights from your data for {displayDateRange}.</p>
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="ai-question" className="block text-sm font-medium text-gray-700">
            Your Question
          </label>
          <textarea
            id="ai-question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            placeholder="e.g., Which technician was most productive? or Why is labor revenue higher than parts?"
          />
        </div>
        
        <div className="mt-4">
            <button
            onClick={handleAskAI}
            disabled={isLoading}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300"
            >
            {isLoading ? 'Getting Insights...' : 'Get Insights'}
            </button>
        </div>

        {(isLoading || response || error) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                {isLoading && (
                    <div className="flex items-center justify-center text-gray-600">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Analyzing your data...</span>
                    </div>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
                {response && (
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-2">AI Insights:</h3>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{response}</div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default AskAIModal;