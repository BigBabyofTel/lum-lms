import Navbar from '@/components/Navbar';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-4 sm:px-4 md:px-10 pt-24">{children}</main>
    </div>
  );
}
