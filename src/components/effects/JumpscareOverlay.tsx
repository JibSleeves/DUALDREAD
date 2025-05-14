// src/components/effects/JumpscareOverlay.tsx
"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface JumpscareOverlayProps {
  active: boolean;
}

export function JumpscareOverlay({ active }: JumpscareOverlayProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.05 }} // Very fast flash
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-red-700/80 pointer-events-none"
        >
          {/* You could add a distorted image or sound effect trigger here if desired */}
          {/* For now, it's a red flash. Consider adding a quick static image or SVG */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
