'use client'
import React, {useState} from 'react'
import {UserCircle2, MoreVertical, Users, Send} from 'lucide-react'

// Mock data for posts
const posts = [
    {
        id: '1',
        author: 'Unknown user',
        date: 'May 24, 2020',
        content: 'Use this link to log in with your google classroom email. This is the typing website to work on over the summer.',
        link: 'https://www.typing.com/student/login',
        comments: [
            {
                id: '1',
                author: 'Kamal Jagafarov',
                date: 'Feb 25',
                content: 'Waddup fellas if anyone sees this then add me on my discord pieaareepic_23473',
                avatar: 'K'
            }
        ]
    },
    {
        id: '2',
        author: 'Unknown user',
        date: 'May 13, 2020',
        content: 'Complete this google form before our session at 10 A.M.',
        link: 'https://forms.gle/M4m3ReqYc8Ya8vZG6',
        comments: []
    }
]

export default function StreamPage() {
    const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({})

    const handleCommentChange = (postId: string, value: string) => {
        setCommentInputs(prev => ({...prev, [postId]: value}))
    }

    return (
        <div className="space-y-6">
            {/* Class Header Banner */}
            <div className="bg-gradient-to-b from-gray-700 to-gray-400 rounded-lg h-48 relative overflow-hidden">
                <div className="absolute bottom-4 left-6">
                    <h2 className="text-white text-3xl font-bold">2B</h2>
                    <p className="text-white text-sm">Grade 2</p>
                </div>
            </div>

            {/* Posts */}
            <div className="space-y-4">
                {posts.map((post) => (
                    <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                        {/* Post Header */}
                        <div className="p-4 flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                    <UserCircle2 size={24} className="text-gray-500 dark:text-gray-400"/>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{post.author}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{post.date}</p>
                                </div>
                            </div>
                            <button
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                aria-label="More options"
                            >
                                <MoreVertical size={20} className="text-gray-600 dark:text-gray-400"/>
                            </button>
                        </div>

                        {/* Post Content */}
                        <div className="px-4 pb-4">
                            <p className="text-gray-700 dark:text-gray-300 mb-2">{post.content}</p>
                            {post.link && (
                                <a
                                    href={post.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                                >
                                    {post.link}
                                </a>
                            )}
                        </div>

                        {/* Comments Section */}
                        {post.comments.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                                <button className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                                    <Users size={16}/>
                                    {post.comments.length} class comment{post.comments.length !== 1 ? 's' : ''}
                                </button>
                                <div className="mt-3 space-y-3">
                                    {post.comments.map((comment) => (
                                        <div key={comment.id} className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                                {comment.avatar}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-baseline gap-2">
                                                    <p className="font-medium text-sm text-gray-900 dark:text-white">{comment.author}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{comment.date}</p>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comment.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add Comment */}
                        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                    A
                                </div>
                                <input
                                    type="text"
                                    placeholder="Add class comment..."
                                    value={commentInputs[post.id] || ''}
                                    onChange={(e) => handleCommentChange(post.id, e.target.value)}
                                    className="flex-1 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    aria-label="Send comment"
                                >
                                    <Send size={20} className="text-blue-600 dark:text-blue-400"/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
