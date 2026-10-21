'use client'

import { createTemplate } from '../actions'
import { useState } from 'react'
import Link from 'next/link'

export default function CreateTemplatePage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const formData = new FormData(e.currentTarget)
        try {
            await createTemplate(formData)
        } catch (submitError) {
            console.error(submitError)
            setError(submitError instanceof Error ? submitError.message : 'Failed to create template')
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Create Email Template</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow transition-colors">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Template Name
                    </label>
                    <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g. Microsoft Password Reset"
                    />
                </div>

                <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Subject
                    </label>
                    <input
                        type="text"
                        name="subject"
                        id="subject"
                        required
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Action Required: Reset your password"
                    />
                </div>

                <div>
                    <label htmlFor="bodyHtml" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Body (HTML)
                    </label>
                    <div className="mt-1">
                        <textarea
                            name="bodyHtml"
                            id="bodyHtml"
                            rows={10}
                            required
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="<html><body>...</body></html>"
                        />
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        You can use HTML here. Use <code>{`{{link}}`}</code> to insert the phishing link.
                    </p>
                </div>

                {error && <div className="auth-message error">{error}</div>}
                <div className="flex justify-end gap-2">
                    <Link href="/dashboard/templates" className="button secondary">Cancel</Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="button primary"
                    >
                        {loading ? 'Creating…' : 'Create template'}
                    </button>
                </div>
            </form>
        </div>
    )
}
