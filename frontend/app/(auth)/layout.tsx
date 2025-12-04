import Navbar from "@/components/Navbar";

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen">
			<main className="px-2 sm:px-4 md:px-10">{children}</main>
		</div>
	);
}

