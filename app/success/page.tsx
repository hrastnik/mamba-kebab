import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-bold text-green-600 mb-4">
        Order Received!
      </h1>
      <p className="text-xl mb-8">Thank you. Your food is being prepared.</p>
      <Link
        href="/"
        className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
      >
        Back to Menu
      </Link>
    </div>
  );
}
