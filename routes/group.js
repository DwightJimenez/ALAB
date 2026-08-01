const express = require("express");
const crypto = require("crypto");
const { Op } = require("sequelize");
const {
  LabGroup,
  GroupMember,
  LabSession,
  User,
  ExperimentSubmission,
  GroupCartItem,
  Document,
  ItemInstance,
  sequelize,
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();
const lobbies = new Map();

router.post("/create", verifyToken, async (req, res) => {
  try {
    const { labSessionId, assignmentId } = req.body;
    const joinCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    const lobbyData = {
      joinCode,
      status: "FORMING",
      labSessionId,
      assignmentId,
      members: [
        {
          id: req.user.id,
          name: req.user.name,
          section: req.user.section,
          role: "LEADER",
        },
      ],
    };

    lobbies.set(joinCode, lobbyData);

    setTimeout(() => {
      lobbies.delete(joinCode);
    }, 3600 * 1000);

    res.status(201).json({
      message: "Group lobby created!",
      joinCode: joinCode,
      members: lobbyData.members,
    });
  } catch (error) {
    console.error("Failed to create group lobby:", error);
    res.status(500).json({ error: "Failed to create lab group." });
  }
});

router.post("/join", verifyToken, async (req, res) => {
  try {
    const { joinCode } = req.body;
    const userId = req.user.id;
    const lobby = lobbies.get(joinCode);
    if (!lobby) {
      return res.status(404).json({ error: "Invalid or expired group code." });
    }

    const alreadyJoined = lobby.members.some((m) => m.id === userId);
    if (alreadyJoined) {
      return res.status(400).json({ error: "You are already in this group." });
    }

    lobby.members.push({
      id: userId,
      name: req.user.name,
      section: req.user.section,
      role: "MEMBER",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(joinCode).emit("lobby_updated", lobby);
    }

    res.status(200).json({
      message: "Successfully joined the group!",
      joinCode: joinCode,
    });
  } catch (error) {
    console.error("Failed to join group:", error);
    res.status(500).json({ error: "Failed to join lab group." });
  }
});

router.get("/lobby/:joinCode", verifyToken, async (req, res) => {
  try {
    const { joinCode } = req.params;
    const lobby = lobbies.get(joinCode);

    if (!lobby)
      return res
        .status(404)
        .json({ error: "Lobby not found or already locked." });

    res.status(200).json(lobby);
  } catch (error) {
    console.error("Failed to fetch lobby state:", error);
    res.status(500).json({ error: "Failed to load lobby data." });
  }
});

router.post("/:joinCode/lock", verifyToken, async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { joinCode } = req.params;
    const { itemInstanceIds } = req.body;

    const lobby = lobbies.get(joinCode);
    if (!lobby) {
      await t.rollback();
      return res
        .status(404)
        .json({ error: "Lobby expired or already locked." });
    }

    const newGroup = await LabGroup.create(
      {
        joinCode: lobby.joinCode,
        status: "ACTIVE",
        labSessionId: lobby.labSessionId,
        assignmentId: lobby.assignmentId,
      },
      { transaction: t },
    );

    const memberRecords = lobby.members.map((m) => ({
      groupId: newGroup.id,
      userId: m.id,
      role: m.role,
    }));
    await GroupMember.bulkCreate(memberRecords, { transaction: t });

    if (itemInstanceIds && Array.isArray(itemInstanceIds)) {
      const cartItems = itemInstanceIds.map((itemId) => ({
        groupId: newGroup.id,
        itemInstanceId: itemId,
        status: "PENDING",
      }));
      await GroupCartItem.bulkCreate(cartItems, { transaction: t });
    }

    await t.commit();

    lobbies.delete(joinCode);

    const io = req.app.get("io");
    if (io) {
      io.to(joinCode).emit("group_locked", {
        groupId: newGroup.id,
        status: "ACTIVE",
      });
    }

    res.status(200).json({
      message: "Group locked and cart populated!",
      groupId: newGroup.id,
      status: "ACTIVE",
    });
  } catch (error) {
    await t.rollback();
    console.error("Failed to lock group:", error);
    res.status(500).json({ error: "Failed to finalize lab group." });
  }
});

router.get("/my-group/:assignmentId", verifyToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;

    const dbGroup = await LabGroup.findOne({
      where: { assignmentId },
      include: [
        {
          model: User,
          as: "members",
          where: { id: userId },
        },
      ],
    });

    if (dbGroup) {
      const fullGroup = await LabGroup.findByPk(dbGroup.id, {
        include: [
          {
            model: User,
            as: "members",
            attributes: ["id", "name", "section", "avatar"],
            through: { attributes: ["role"] },
          },
        ],
      });

      const myRole = fullGroup.members.find((m) => m.id === userId).GroupMember
        .role;

      return res.status(200).json({
        id: fullGroup.id,
        joinCode: fullGroup.joinCode,
        status: fullGroup.status,
        role: myRole,
        members: fullGroup.members,
      });
    }

    for (const [joinCode, lobby] of lobbies.entries()) {
      if (lobby.assignmentId == assignmentId) {
        const member = lobby.members.find((m) => m.id === userId);
        if (member) {
          return res.status(200).json({
            id: null,
            joinCode: lobby.joinCode,
            status: lobby.status,
            role: member.role,
            members: lobby.members,
          });
        }
      }
    }

    return res.status(200).json(null);
  } catch (error) {
    console.error("Failed to check group status:", error);
    res
      .status(500)
      .json({ error: "Failed to check cross-device group status." });
  }
});

router.post("/:id/submit", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the group
    const group = await LabGroup.findByPk(id);
    if (!group) return res.status(404).json({ error: "Group not found." });

    // 2. Verify that the Hocuspocus BLOB actually exists before they submit
    const document = await Document.findOne({ where: { groupId: id } });
    if (!document) {
      return res
        .status(400)
        .json({ error: "No workspace data found to submit." });
    }

    // 3. Create the submission receipt (no submissionData required!)
    const [submission, created] = await ExperimentSubmission.findOrCreate({
      where: { groupId: id },
    });

    // 4. Lock the group status so they can't edit the workspace anymore
    group.status = "SUBMITTED";
    await group.save();

    res.status(201).json({
      message: "Experiment submitted successfully!",
      submission,
    });
  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({ error: "Failed to submit experiment." });
  }
});

router.delete("/lobby/:joinCode/cancel", verifyToken, async (req, res) => {
  try {
    const { joinCode } = req.params;
    const userId = req.user.id;
    const lobby = lobbies.get(joinCode);

    if (!lobby) {
      return res
        .status(404)
        .json({ error: "Lobby not found or already closed." });
    }

    const userInLobby = lobby.members.find((m) => m.id === userId);

    if (!userInLobby) {
      return res.status(403).json({ error: "You are not in this lobby." });
    }

    const io = req.app.get("io");

    if (userInLobby.role === "LEADER") {
      lobbies.delete(joinCode);

      if (io) {
        io.to(joinCode).emit("lobby_cancelled");
      }

      return res
        .status(200)
        .json({ message: "Lobby cancelled and destroyed." });
    } else {
      lobby.members = lobby.members.filter((m) => m.id !== userId);

      if (io) {
        io.to(joinCode).emit("lobby_updated", lobby);
      }

      return res.status(200).json({ message: "Successfully left the lobby." });
    }
  } catch (error) {
    console.error("Failed to cancel/leave lobby:", error);
    res.status(500).json({ error: "Failed to process leave request." });
  }
});

router.post("/:groupId/cart/checkout", verifyToken, async (req, res) => {
  // Start a transaction so if one item fails, the whole cart rolls back cleanly
  const transaction = await sequelize.transaction();

  try {
    const { groupId } = req.params;
    const { cartItems } = req.body;

    // 1. Basic validation
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }

    const group = await LabGroup.findByPk(groupId, { transaction });
    if (!group) {
      return res.status(404).json({ error: "Lab group not found." });
    }

    // 2. Process each item in the cart
    for (const item of cartItems) {
      const requestedQty = parseInt(item.quantity);

      // Find all physical instances belonging to this Inventory catalog item
      const allInstances = await ItemInstance.findAll({
        where: { inventoryId: item.inventoryId },
        transaction,
      });

      // Find which of these instances are currently checked out or pending for ANY group
      const busyCartItems = await GroupCartItem.findAll({
        where: {
          itemInstanceId: allInstances.map((inst) => inst.id),
          status: {
            [Op.in]: ["PENDING", "DISPENSED"],
          },
        },
        transaction,
      });

      const busyInstanceIds = busyCartItems.map((bci) => bci.itemInstanceId);

      // Filter down to only the instances that are actually sitting on the shelf
      const availableInstances = allInstances.filter(
        (inst) => !busyInstanceIds.includes(inst.id)
      );

      // 3. Check if we have enough stock for this specific item
      if (availableInstances.length < requestedQty) {
        throw new Error(
          `Not enough available stock for ${item.name}. Requested: ${requestedQty}, Available: ${availableInstances.length}`
        );
      }

      // 4. Reserve the exact number of physical instances needed
      const instancesToAssign = availableInstances.slice(0, requestedQty);

      // 5. Create the junction records linking the Group to the Physical Items
      for (const instance of instancesToAssign) {
        await GroupCartItem.create(
          {
            groupId: group.id,
            itemInstanceId: instance.id,
            status: "PENDING",
          },
          { transaction }
        );
      }
    }

    // If everything succeeded, save the transaction to the database
    await transaction.commit();
    res.status(200).json({ message: "Group request submitted successfully!" });

  } catch (error) {
    // If any item lacked stock or threw an error, undo ALL the reservations
    await transaction.rollback();
    console.error("Group Checkout Error:", error);
    
    res.status(400).json({ 
      error: error.message || "Failed to process group checkout." 
    });
  }
});

module.exports = router;
