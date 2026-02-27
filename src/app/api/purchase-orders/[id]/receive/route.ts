import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const receiveSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().min(1),
    receivedQty: z.number().int().min(0),
  })),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    const po = await prisma.purchaseOrder.findFirst({
      where: { id, userId: user.id },
      include: { items: true },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    if (po.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot receive cancelled PO" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = receiveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Build a map of item updates
    const itemMap = new Map(po.items.map((i) => [i.id, i]));

    const updated = await prisma.$transaction(async (tx) => {
      for (const received of parsed.data.items) {
        const item = itemMap.get(received.itemId);
        if (!item) continue;

        // Calculate new qty received for this item
        const newReceivedQty = received.receivedQty;
        const addedQty = newReceivedQty - item.receivedQty;

        if (addedQty <= 0) continue;

        // Update the PO item received qty
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQty: newReceivedQty },
        });

        // Increase material stock
        if (item.materialId) {
          const material = await tx.material.findUnique({
            where: { id: item.materialId },
            select: { stockQty: true },
          });
          if (material) {
            const newStockQty = material.stockQty + addedQty;
            await tx.material.update({
              where: { id: item.materialId },
              data: { stockQty: newStockQty },
            });
            await tx.stockTransaction.create({
              data: {
                userId: user.id,
                materialId: item.materialId,
                type: "received",
                quantity: addedQty,
                balanceAfter: newStockQty,
                notes: `PO ${po.poNumber} — ${item.description}`,
              },
            });
          }
        }

        // Increase consumable stock
        if (item.consumableId) {
          const consumable = await tx.consumable.findUnique({
            where: { id: item.consumableId },
            select: { stockQty: true },
          });
          if (consumable) {
            const newStockQty = consumable.stockQty + addedQty;
            await tx.consumable.update({
              where: { id: item.consumableId },
              data: { stockQty: newStockQty },
            });
            await tx.stockTransaction.create({
              data: {
                userId: user.id,
                consumableId: item.consumableId,
                type: "received",
                quantity: addedQty,
                balanceAfter: newStockQty,
                notes: `PO ${po.poNumber} — ${item.description}`,
              },
            });
          }
        }
      }

      // Check if all items are fully received
      const allItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });
      const allReceived = allItems.every((i) => i.receivedQty >= i.quantity);

      // Auto-set status to RECEIVED if everything is received
      const newStatus = allReceived ? "RECEIVED" : po.status === "DRAFT" ? "ORDERED" : po.status;

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
        include: {
          supplier: true,
          items: {
            include: {
              material: { select: { id: true, materialType: true, brand: true, colour: true, stockQty: true } },
              consumable: { select: { id: true, name: true, category: true, stockQty: true } },
            },
          },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to receive purchase order:", error);
    return NextResponse.json(
      { error: "Failed to receive items" },
      { status: 500 }
    );
  }
}
