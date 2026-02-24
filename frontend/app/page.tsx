export default function Home() {
    return (
        <>
            <div className="border p-2">
                <h1 className="text-6xl font-bold">Welcome to Luminescence</h1>
                <h2>This is the landing page!!</h2>
                <button className="border p-2 rounded-3xl bg-slate-400 hover:bg-slate-500 text-white">
                    <a href="http://localhost:3000/auth" className="text-xl">
                        Enter Portal
                    </a>
                </button>
            </div>
        </>
    );
}
