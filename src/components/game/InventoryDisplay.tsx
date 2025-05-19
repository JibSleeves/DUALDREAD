
// src/components/game/InventoryDisplay.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, GripVertical, PackageSearch } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface InventoryDisplayProps {
  items: string[];
}

export function InventoryDisplay({ items }: InventoryDisplayProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-card/70 backdrop-blur-sm shadow-md border-secondary/30 mt-6">
          <CardHeader className="py-3 px-4">
            <CardTitle className="font-horror text-lg text-secondary-foreground flex items-center">
              <Briefcase className="mr-2 h-5 w-5 text-accent" />
              Relics & Remnants
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 min-h-[50px]">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-sm text-muted-foreground italic py-2">
                <PackageSearch className="h-8 w-8 mb-2 text-muted-foreground/70"/>
                Your pockets are disturbingly empty... for now.
              </div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence>
                  {items.map((item, index) => (
                    <motion.li
                      key={`${item}-${index}`}
                      layout // Enables smooth reordering if items are removed/added
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-center text-foreground/90 text-sm border-b border-dashed border-border/30 pb-1 last:border-b-0 last:pb-0"
                    >
                      <GripVertical className="mr-2 h-4 w-4 text-accent/70 shrink-0" />
                      {item}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

    