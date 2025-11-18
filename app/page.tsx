import { supabase } from "@/app/lib/supabase";
import MenuInterface from "@/app/components/MenuInterface";

export const revalidate = 0;

export default async function Home() {
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .order("id", { ascending: true });

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-10 pt-10">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-2">
            MAMBA KEBABS
          </h1>
          <p className="text-gray-500">The best kebabs in town.</p>
        </div>

        {/* Pass the data to the client component */}
        <MenuInterface menuItems={menuItems || []} />
      </div>
    </main>
  );
}
