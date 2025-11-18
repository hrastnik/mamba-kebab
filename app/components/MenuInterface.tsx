"use client";

import { useState } from "react";

// --- TYPES ---
type MenuItem = {
  id: number;
  name: string;
  price: number;
  category: string;
  options_type: string;
};

type CartItem = {
  uniqueId: string; // We need this because you might order 2 identical kebabs with different sauces
  menuId: number;
  name: string;
  price: number;
  details: string; // Stores the ingredients or the note
};

// --- CONSTANTS ---
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
  // State for the Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // State for the Popup Modal
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for User Selections inside the Modal
  const [kebabOptions, setKebabOptions] = useState<string[]>([]);
  const [textNote, setTextNote] = useState("");

  // 1. Handle opening the modal
  const openModal = (item: MenuItem) => {
    setSelectedItem(item);
    // Reset choices
    setTextNote("");
    // By default, maybe all ingredients are selected? Or none. Let's do none for now to be safe.
    setKebabOptions([]);
    setIsModalOpen(true);
  };

  // 2. Handle Adding to Cart
  const handleAddToCart = () => {
    if (!selectedItem) return;

    let finalDetails = "";

    if (selectedItem.options_type === "kebab") {
      if (kebabOptions.length === 0) {
        finalDetails = "No specific ingredients selected";
      } else {
        finalDetails = kebabOptions.join(", ");
      }
    } else {
      finalDetails = textNote || "No special instructions";
    }

    const newItem: CartItem = {
      uniqueId: Math.random().toString(36).substr(2, 9),
      menuId: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price,
      details: finalDetails,
    };

    setCart([...cart, newItem]);
    setIsModalOpen(false);
  };

  // 3. Toggle Kebab Ingredients
  const toggleIngredient = (ing: string) => {
    if (kebabOptions.includes(ing)) {
      setKebabOptions(kebabOptions.filter((i) => i !== ing));
    } else {
      setKebabOptions([...kebabOptions, ing]);
    }
  };

  // 4. Calculate Total
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = async () => {
    // Show a loading state if you want, but for now:
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cart }),
    });

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url; // Redirect to Stripe
    } else {
      alert("Something went wrong!");
    }
  };

  return (
    <div className="relative">
      {/* --- MENU GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
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
              Add to Order
            </button>
          </div>
        ))}
      </div>

      {/* --- FLOATING CART BAR --- */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t-2 border-blue-600 p-4 shadow-2xl flex justify-between items-center z-40">
          <div>
            <p className="font-bold text-lg">{cart.length} Items</p>
            <p className="text-gray-600 text-sm">
              Total: €{cartTotal.toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleCheckout}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700"
          >
            Checkout (€{cartTotal.toFixed(2)})
          </button>
        </div>
      )}

      {/* --- MODAL (POPUP) --- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-black">
            <h3 className="text-2xl font-bold mb-2">{selectedItem.name}</h3>
            <p className="mb-4 text-gray-600">Customize your order:</p>

            {/* LOGIC: If Kebab, show checkboxes. If Text, show input */}
            {selectedItem.options_type === "kebab" ? (
              <div className="space-y-2 mb-6">
                <p className="font-semibold text-sm mb-2">
                  Select Ingredients:
                </p>
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
                  Special Requests / Changes:
                </label>
                <textarea
                  className="w-full border p-2 rounded"
                  rows={3}
                  placeholder="e.g. No pickles, extra mayo..."
                  value={textNote}
                  onChange={(e) => setTextNote(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
              >
                Add to Cart - €{selectedItem.price.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
