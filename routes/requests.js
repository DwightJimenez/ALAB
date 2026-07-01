const express = require("express");
const { MaterialRequest, Inventory, User, ItemInstance } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// POST: Submit a "Cart" of requests
router.post("/checkout", verifyToken, async (req, res) => {
  try {
    const { cartItems } = req.body;
    const studentId = req.user.id;

    // 1. Check if the cart is empty
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    // 2. Fetch the student's mastery status
    const unmastered = await StudentSkill.findAll({
      where: { 
        userId: studentId, 
        isMastered: false 
      }
    });

    // 3. ENFORCE SAFETY GATE: If any skill is not mastered, block the request
    if (unmastered.length > 0) {
      return res.status(403).json({ 
        error: "Access Denied: You must complete your Safety Gate assessments before requesting materials." 
      });
    }

    // 4. Format the incoming cart into individual MaterialRequest rows
    const requestsToCreate = cartItems.map((item) => ({
      studentId: studentId,
      inventoryId: item.inventoryId,
      amountRequested: item.quantity,
      status: "PENDING",
    }));

    // 5. Save all requests
    await MaterialRequest.bulkCreate(requestsToCreate);

    res.status(201).json({ message: "Booking request submitted successfully!" });
  } catch (error) {
    console.error("Checkout failed:", error);
    res.status(500).json({ error: "Failed to submit booking request." });
  }
});

// GET: Fetch all pending requests for Admins
router.get("/pending", verifyToken, async (req, res) => {
  try {
    const pendingRequests = await MaterialRequest.findAll({
      where: { status: "PENDING" },
      include: [
        { model: User, as: "student", attributes: ["name", "email"] },
        {
          model: Inventory,
          as: "inventory",
          include: [
            {
              model: ItemInstance,
              as: "instances",
              where: { condition: "Good" }, // Only show items in Good condition
              required: false, // Allow it to return even if no instances are currently "Good"
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(pendingRequests);
  } catch (error) {
    console.error("Failed to fetch requests:", error);
    res.status(500).json({ error: "Failed to load pending requests." });
  }
});

// PUT: Approve a request and assign specific Control Numbers
router.put("/:id/approve", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedInstanceIds } = req.body; // Array of ItemInstance IDs the admin selected

    const request = await MaterialRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: "Request not found." });

    // Mark the request as approved
    request.status = "APPROVED";
    await request.save();

    // If Control Numbers were assigned (Equipment/Glassware), update their status
    // (You might want to add a 'status' field like 'Available' or 'Borrowed' to ItemInstance later,
    // but for now, we just acknowledge the approval logic)
    if (assignedInstanceIds && assignedInstanceIds.length > 0) {
      await ItemInstance.update(
        { condition: "In Use" }, // Or whatever logic you use to track borrowed items
        { where: { id: assignedInstanceIds } },
      );
    }

    // Deduct from the main inventory total quantity
    const inventory = await Inventory.findByPk(request.inventoryId);
    if (inventory) {
      inventory.totalQuantity -= request.amountRequested;
      await inventory.save();
    }

    res.status(200).json({ message: "Request approved successfully!" });
  } catch (error) {
    console.error("Approval failed:", error);
    res.status(500).json({ error: "Failed to approve request." });
  }
});

// PUT: Reject a request
router.put("/:id/reject", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await MaterialRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: "Request not found." });

    // Mark the request as rejected
    request.status = "REJECTED";
    await request.save();

    res.status(200).json({ message: "Request rejected successfully!" });
  } catch (error) {
    console.error("Rejection failed:", error);
    res.status(500).json({ error: "Failed to reject request." });
  }
});

// GET: Fetch all active (APPROVED) requests for Admins to manage returns
router.get("/active", verifyToken, async (req, res) => {
  try {
    const activeRequests = await MaterialRequest.findAll({
      where: { status: "APPROVED" },
      include: [
        { model: User, as: "student", attributes: ["name", "email"] },
        {
          model: Inventory,
          as: "inventory",
          include: [
            {
              model: ItemInstance,
              as: "instances",
              where: { condition: "In Use" }, // Only show the borrowed instances
              required: false,
            },
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    res.status(200).json(activeRequests);
  } catch (error) {
    console.error("Failed to fetch active requests:", error);
    res.status(500).json({ error: "Failed to load active requests." });
  }
});

// PUT: Process a return and assess condition
router.put("/:id/return", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { returnedInstances } = req.body; // Array of { id: instanceId, condition: "Good"|"Fair"|"Damaged" }

    const request = await MaterialRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: "Request not found." });

    // 1. Mark request as returned
    request.status = "RETURNED";
    await request.save();

    // 2. Update the condition of the specific returned physical items
    if (returnedInstances && returnedInstances.length > 0) {
      for (const inst of returnedInstances) {
        await ItemInstance.update(
          { condition: inst.condition },
          { where: { id: inst.id } }
        );
      }
    }

    // 3. Add the quantity back to the main inventory catalog
    const inventory = await Inventory.findByPk(request.inventoryId);
    if (inventory) {
      inventory.totalQuantity += request.amountRequested;
      await inventory.save();
    }

    res.status(200).json({ message: "Items returned successfully!" });
  } catch (error) {
    console.error("Return failed:", error);
    res.status(500).json({ error: "Failed to process return." });
  }
});

module.exports = router;