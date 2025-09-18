import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ChartBarIcon } from './icons';

interface AnalyzeProductivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  productivityData: any[];
  // FIX: Added 'day' to the dateRange type to match the possible values from the Dashboard page.
  dateRange: 'day' | 'week' | 'month';
}

const AnalyzeProductivityModal: React.FC<AnalyzeProductivityModalProps> = ({ isOpen, onClose, productivityData, dateRange }) => {
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = useCallback(async (userQuestion?: string) => {
    setIsLoading(true);
    if (!userQuestion) { // Don't clear previous analysis for follow-ups
        setAnalysis('');
    }
    setError(null);

    const displayDateRange = dateRange === 'day' ? 'today' : `this ${dateRange}`;

    const initialPrompt = `
      You are a helpful business analyst for a vehicle repair workshop.
      Analyze the following JSON data which represents technician productivity for ${displayDateRange}.
      The data shows 'logged' hours (time spent on the job) and 'billed' hours (time charged to the customer).

      Data:
      ${JSON.stringify(productivityData, null, 2)}

      Initial Analysis Task:
      1.  Provide a concise summary of the overall team productivity.
      2.  Identify the most productive technician based on billed hours.
      3.  Point out any technicians with a significant negative discrepancy (logged > billed) and suggest what this might indicate (e.g., inefficiency, complex jobs, under-billing).
      4.  Point out any technicians with a significant positive discrepancy (billed > logged) and suggest what this might indicate (e.g., high efficiency, fixed-rate job profitability).
      Format your response using markdown for clarity (headings, bullet points).
    `;

    const followUpPrompt = `
      You are a helpful business analyst for a vehicle repair workshop.
      You have already provided an initial analysis on the data below. Now, answer the user's follow-up question based ONLY on this data.

      Data:
      ${JSON.stringify(productivityData, null, 2)}

      User's question: "${userQuestion}"
    `;

    const prompt = userQuestion ? followUpPrompt : initialPrompt;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = result.text;
      setAnalysis(prev => userQuestion ? `${prev}\n\n**Q: ${userQuestion}**\n\n${text}` : text);
    } catch (err) {
      console.error('Gemini API call failed:', err);
      setError('Sorry, something went wrong while fetching insights. Please try again.');
    } finally {
      setIsLoading(false);
      setQuestion('');
    }
  }, [productivityData, dateRange]);


  useEffect(() => {
    if (isOpen) {
      // Reset state and run initial analysis
      setQuestion('');
      setError(null);
      generateAnalysis();
    }
  }, [isOpen, generateAnalysis]);

  const handleFollowUp = () => {
      if (!question.trim()) {
        setError("Please enter a follow-up question.");
        return;
      }
      generateAnalysis(question);
  }

  if (!isOpen) return null;

  const displayDateRange = dateRange === 'day' ? 'today' : `this ${dateRange}`;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="productivity-modal-title"
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
          <div className="flex-shrink-0 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
             <div className="text-green-600"> <ChartBarIcon className="w-7 h-7" /></div>
          </div>
          <div>
            <h2 id="productivity-modal-title" className="text-xl font-bold text-gray-900">AI Productivity Analysis</h2>
            <p className="text-sm text-gray-500 mt-1">An automated analysis of technician productivity for {displayDateRange}.</p>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border max-h-[40vh] overflow-y-auto">
            {isLoading && !analysis && (
                <div className="flex items-center justify-center text-gray-600">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating initial analysis...</span>
                </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {analysis && (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{analysis}</div>
            )}
        </div>

        <div className="mt-4">
          <label htmlFor="ai-followup" className="block text-sm font-medium text-gray-700">
            Ask a follow-up question
          </label>
          <div className="mt-1 flex gap-2">
            <input
                id="ai-followup"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., What is the team's average efficiency?"
            />
            <button
                onClick={handleFollowUp}
                disabled={isLoading}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300"
                >
                {isLoading ? '...' : 'Ask'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeProductivityModal;