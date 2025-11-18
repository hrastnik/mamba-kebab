"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase";

type Order = {
  id: number;
  created_at: string;
  total_price: number;
  order_status: string; // new, acknowledged, cooking, ready, completed, canceled
  payment_status: string; // paid, unpaid
  customer_name: string;
  items: any[];
};

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleLogin = () => {
    if (password === "1234") {
      setIsAuthenticated(true);
      fetchOrders();
    } else {
      alert("Wrong password!");
    }
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .neq("order_status", "completed") // Don't show completed orders by default (keeps list clean)
      .neq("order_status", "canceled")
      .order("created_at", { ascending: false });

    if (data) setOrders(data);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    audioRef.current = new Audio("/notification.mp3");

    const channel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" }, // Listen to ALL changes (updates too)
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            setOrders((prev) => [newOrder, ...prev]);
            audioRef.current?.play();
          } else if (payload.eventType === "UPDATE") {
            // Refresh list to reflect status changes (like payment success)
            fetchOrders();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const updateStatus = async (orderId: number, newStatus: string) => {
    // 1. Update UI instantly
    if (newStatus === "completed" || newStatus === "canceled") {
      setOrders(orders.filter((o) => o.id !== orderId)); // Remove from screen
    } else {
      setOrders(
        orders.map((o) =>
          o.id === orderId ? { ...o, order_status: newStatus } : o
        )
      );
    }

    // 2. Update DB
    await supabase
      .from("orders")
      .update({ order_status: newStatus })
      .eq("id", orderId);
  };

  if (!isAuthenticated)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-gray-800 p-8 rounded">
          <input
            type="password"
            className="text-black p-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="bg-green-600 p-2 rounded ml-2"
          >
            Login
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6 text-black">Kitchen Monitor</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`border-l-8 p-5 rounded shadow-lg bg-white text-black flex flex-col justify-between relative ${
              order.payment_status === "paid"
                ? "border-green-500"
                : "border-red-500"
            }`}
          >
            {/* HEADER */}
            <div className="flex justify-between items-start border-b pb-3 mb-3">
              <div>
                <h2 className="text-3xl font-extrabold">#{order.id}</h2>
                <p className="text-xl font-bold text-blue-700">
                  {order.customer_name}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`block font-bold text-lg ${
                    order.payment_status === "paid"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {order.payment_status.toUpperCase()}
                </span>
                <span className="text-gray-500">€{order.total_price}</span>
              </div>
            </div>

            {/* ITEMS */}
            <div className="space-y-4 mb-6 flex-grow">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="bg-gray-50 p-2 rounded">
                  <div className="flex justify-between font-bold text-lg">
                    <span>{item.name}</span>
                    <span className="text-purple-600">{item.itemOwner}</span>
                  </div>
                  <p className="text-sm text-gray-600">{item.details}</p>
                </div>
              ))}
            </div>

            {/* STATUS WORKFLOW ACTIONS */}
            <div className="pt-4 border-t grid grid-cols-1 gap-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-500 uppercase">
                  Current Status:
                </span>
                <span className="px-2 py-1 bg-gray-200 rounded font-bold uppercase">
                  {order.order_status}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => updateStatus(order.id, "acknowledged")}
                  className={`p-2 text-xs font-bold text-white rounded ${
                    order.order_status === "new"
                      ? "bg-blue-600 animate-pulse"
                      : "bg-gray-400"
                  }`}
                >
                  ACK
                </button>
                <button
                  onClick={() => updateStatus(order.id, "cooking")}
                  className={`p-2 text-xs font-bold text-white rounded ${
                    order.order_status === "acknowledged"
                      ? "bg-orange-500"
                      : "bg-gray-400"
                  }`}
                >
                  COOK
                </button>
                <button
                  onClick={() => updateStatus(order.id, "ready")}
                  className={`p-2 text-xs font-bold text-white rounded ${
                    order.order_status === "cooking"
                      ? "bg-green-500"
                      : "bg-gray-400"
                  }`}
                >
                  READY
                </button>
                <button
                  onClick={() => updateStatus(order.id, "completed")}
                  className="p-2 text-xs font-bold text-white bg-gray-800 rounded hover:bg-black"
                >
                  DONE
                </button>
              </div>

              <button
                onClick={() => updateStatus(order.id, "canceled")}
                className="mt-2 text-red-500 text-xs underline w-full text-center"
              >
                Cancel Order
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
