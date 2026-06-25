function updateBKTKnowledge(currentKnowledge, isCorrect, guessRate = 0.2, slipRate = 0.1, learningRate = 0.1) {
    let probKnowsSkill;

    // Step A: Calculate based on whether the answer was right or wrong
    if (isCorrect) {
        const top = currentKnowledge * (1 - slipRate);
        const bottom = top + ((1 - currentKnowledge) * guessRate);
        probKnowsSkill = top / bottom;
    } else {
        const top = currentKnowledge * slipRate;
        const bottom = top + ((1 - currentKnowledge) * (1 - guessRate));
        probKnowsSkill = top / bottom;
    }

    // Step B: Apply the learning transition rate
    const newKnowledgeEstimate = probKnowsSkill + ((1 - probKnowsSkill) * learningRate);

    // Return the new probability (a decimal between 0 and 1)
    return newKnowledgeEstimate;
}

module.exports = { updateBKTKnowledge };