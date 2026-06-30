const { sequelize, Skill, Question } = require("./models");

const seedData = async () => {
  try {
    await sequelize.sync({ alter: true });

    // 1. Use findOrCreate so it doesn't crash if the skill already exists
    const [spillSkill, created] = await Skill.findOrCreate({
      where: { name: "Chemical Spill Response" }, // The unique identifier it checks for
      defaults: {
        description: "Proper procedures for containing and cleaning hazardous chemical spills.",
        pL0: 0.1,
        pT: 0.25,
        pG: 0.2,
        pS: 0.1,
        masteryThreshold: 0.95,
      }
    });

    // 2. Only insert the questions if the Skill was ACTUALLY created just now.
    // This prevents creating duplicate questions every time you run the seed script.
    if (created) {
      await Question.bulkCreate([
        {
          skillId: spillSkill.id,
          text: "What is the FIRST thing you should do if a large volume of concentrated Hydrochloric Acid spills on the floor?",
          options: JSON.stringify([
            "Pour water on it to dilute it.",
            "Alert others, evacuate the immediate area, and notify the instructor.",
            "Grab paper towels and start wiping from the outside in.",
            "Open the windows to ventilate the room.",
          ]),
          correctAnswer: "Alert others, evacuate the immediate area, and notify the instructor.",
        },
        {
          skillId: spillSkill.id,
          text: "When neutralizing an acid spill, which substance is typically used?",
          options: JSON.stringify([
            "Sodium Bicarbonate (Baking Soda)",
            "Sodium Hydroxide (Lye)",
            "Vinegar",
            "Bleach",
          ]),
          correctAnswer: "Sodium Bicarbonate (Baking Soda)",
        },
      ]);
      console.log("Skill and Real Quiz Questions seeded successfully!");
    } else {
      console.log("Skill 'Chemical Spill Response' already exists. Skipping duplicate seeding.");
    }

    process.exit();
  } catch (error) {
    console.error("Failed to seed database:", error);
    process.exit(1);
  }
};

seedData();