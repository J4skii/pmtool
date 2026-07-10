export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <span className="font-semibold">Client Portal</span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
