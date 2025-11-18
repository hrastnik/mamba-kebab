"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase";

type Order = {
  id: number;
  created_at: string;
  total_price: number;
  status: string;
  items: any[]; // List of cart items
  customer_details: any;
};

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  // Use a ref for the audio so we can play it without user interaction restrictions later
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Simple Security Check (Replace '1234' with your desired code)
  const handleLogin = () => {
    if (password === "1234") {
      setIsAuthenticated(true);
      fetchOrders();
    } else {
      alert("Wrong password!");
    }
  };

  // 2. Fetch initial orders
  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false }); // Newest first

    if (data) setOrders(data);
  };

  // 3. Setup Real-Time Listener
  useEffect(() => {
    if (!isAuthenticated) return;

    // Create the audio object once
    audioRef.current = new Audio("/notification.mp3"); // We need to add this file next

    const channel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          // When a new order comes in:
          const newOrder = payload.new as Order;

          // 1. Add to top of list
          setOrders((prev) => [newOrder, ...prev]);

          // 2. Play Sound
          if (audioRef.current) {
            audioRef.current
              .play()
              .catch((e) => console.log("Audio play failed", e));
          }

          // 3. Browser Alert
          alert(`NEW ORDER: #${newOrder.id} - €${newOrder.total_price}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  // 4. Function to update status (e.g. Cooking -> Ready)
  const updateStatus = async (orderId: number, newStatus: string) => {
    // Optimistic update (update UI immediately)
    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);
  };

  // --- RENDER ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Kitchen Login</h1>
          <input
            type="password"
            className="w-full p-2 text-black rounded mb-4"
            placeholder="Enter Admin PIN"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="w-full bg-green-600 py-2 rounded font-bold"
          >
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Kitchen Dashboard</h1>
        <div className="bg-white px-4 py-2 rounded shadow">
          <span className="text-green-600 font-bold">
            Live Connection Active ●
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`border-l-8 p-6 rounded shadow-lg bg-white text-black ${
              order.status === "pending"
                ? "border-yellow-400"
                : order.status === "paid"
                ? "border-green-500"
                : "border-gray-300"
            }`}
          >
            <div className="flex justify-between mb-4 border-b pb-2">
              <h2 className="text-2xl font-bold">Order #{order.id}</h2>
              <span className="text-xl font-bold">€{order.total_price}</span>
            </div>

            <div className="space-y-3 mb-6">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="">
                  <p className="font-bold text-lg">{item.name}</p>
                  <p className="text-gray-600 text-sm">{item.details}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <span
                className={`px-3 py-1 rounded text-sm font-bold uppercase ${
                  order.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {order.status}
              </span>

              <div className="space-x-2">
                <button
                  onClick={() => updateStatus(order.id, "completed")}
                  className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
