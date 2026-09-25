"use client";

import ScalarNode from './scalar-node'; // Adjust path based on your folder structure

export default function NeuralPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black">
      <div className="grid grid-cols-3 gap-8">
        {/* Example: Testing with different values and colors */}
        <ScalarNode value={2.5} color="#00F2FE" />
        <ScalarNode value={12.0} color="#FF0844" />
        <ScalarNode value={5.0} color="#4FACFE" />
      </div>
    </main>
  );
}
