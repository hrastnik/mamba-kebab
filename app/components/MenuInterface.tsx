"use client";

import { useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  price: number;
  category: string;
  options_type: string;
};

type CartItem = {
  uniqueId: string;
  menuId: number;
  name: string;
  price: number;
  details: string;
  itemOwner: string; // NEW: Name of person eating this specific item
};

const KEBAB_INGREDIENTS = [
  "Spicy sauce",
  "Soft sauce",
  "Onions",
  "Lettuce",
  "Tomatoes",
  "Chili powder",
  "Cabbage",
];

export default function MenuInterface({
  menuItems,
}: {
  menuItems: MenuItem[];
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Modal Inputs
  const [kebabOptions, setKebabOptions] = useState<string[]>([]);
  const [textNote, setTextNote] = useState("");
  const [itemOwner, setItemOwner] = useState(""); // NEW

  // Checkout Input
  const [customerName, setCustomerName] = useState(""); // NEW
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const openModal = (item: MenuItem) => {
    setSelectedItem(item);
    setTextNote("");
    setItemOwner("");
    setKebabOptions(
      item.options_type === "kebab" ? [...KEBAB_INGREDIENTS] : []
    ); // Default all ON for kebabs?
    setIsModalOpen(true);
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    let finalDetails = "";
    if (selectedItem.options_type === "kebab") {
      finalDetails =
        kebabOptions.length > 0
          ? kebabOptions.join(", ")
          : "No ingredients selected";
    } else {
      finalDetails = textNote || "Standard";
    }

    const newItem: CartItem = {
      uniqueId: Math.random().toString(36).substr(2, 9),
      menuId: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price,
      details: finalDetails,
      itemOwner: itemOwner || "Guest", // Default to Guest if empty
    };

    setCart([...cart, newItem]);
    setIsModalOpen(false);
  };

  const toggleIngredient = (ing: string) => {
    if (kebabOptions.includes(ing))
      setKebabOptions(kebabOptions.filter((i) => i !== ing));
    else setKebabOptions([...kebabOptions, ing]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      alert("Please enter your name for the order!");
      return;
    }
    setIsCheckingOut(true);

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart, customerName }), // Sending name to backend
    });

    const data = await response.json();
    if (data.url) window.location.href = data.url;
    else {
      alert("Error starting checkout");
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="relative pb-32">
      {/* MENU GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="border p-4 rounded-lg shadow bg-white text-black flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold">{item.name}</h2>
                <span className="font-bold text-green-600 text-lg">
                  €{item.price.toFixed(2)}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">{item.category}</p>
            </div>
            <button
              onClick={() => openModal(item)}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold"
            >
              Add
            </button>
          </div>
        ))}
      </div>

      {/* CART BAR */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t-2 border-blue-600 p-4 shadow-2xl z-40">
          <div className="max-w-4xl mx-auto">
            {/* List items briefly */}
            <div className="mb-4 max-h-32 overflow-y-auto text-sm text-gray-600 border-b pb-2">
              {cart.map((item) => (
                <div key={item.uniqueId} className="flex justify-between">
                  <span>
                    {item.name} ({item.itemOwner})
                  </span>
                  <span>€{item.price}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="w-full md:w-auto">
                <label className="block text-xs font-bold text-gray-500 uppercase">
                  Order Name
                </label>
                <input
                  type="text"
                  placeholder="Your Name (e.g. Marko)"
                  className="border p-2 rounded w-full md:w-64 text-black"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full md:w-auto bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {isCheckingOut
                  ? "Processing..."
                  : `Pay €${cartTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-black max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-2">{selectedItem.name}</h3>

            {/* NEW: Item Owner Input */}
            <div className="mb-4 bg-yellow-50 p-3 rounded border border-yellow-200">
              <label className="block text-sm font-bold text-yellow-800 mb-1">
                Who is this for? (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Ivan"
                className="w-full border p-2 rounded bg-white"
                value={itemOwner}
                onChange={(e) => setItemOwner(e.target.value)}
              />
            </div>

            {selectedItem.options_type === "kebab" ? (
              <div className="space-y-2 mb-6">
                <p className="font-semibold text-sm mb-2">Ingredients:</p>
                {KEBAB_INGREDIENTS.map((ing) => (
                  <label
                    key={ing}
                    className="flex items-center space-x-3 p-2 border rounded cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={kebabOptions.includes(ing)}
                      onChange={() => toggleIngredient(ing)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span>{ing}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="mb-6">
                <label className="block font-semibold text-sm mb-2">
                  Notes:
                </label>
                <textarea
                  className="w-full border p-2 rounded"
                  rows={3}
                  value={textNote}
                  onChange={(e) => setTextNote(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 border border-gray-300 rounded text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 py-2 bg-blue-600 text-white rounded font-bold"
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
