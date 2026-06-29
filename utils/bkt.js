/**
 * Updates a student's mastery probability based on BKT formulas.
 * * @param {boolean} isCorrect - Did the student get the question right?
 * @param {number} currentPL - The student's current probability of knowing the skill P(L_{n-1})
 * @param {number} pT - Learn Rate P(T)
 * @param {number} pG - Guess Rate P(G)
 * @param {number} pS - Slip Rate P(S)
 * @returns {number} The new probability of knowing the skill P(L_n)
 */
const calculateNewMastery = (isCorrect, currentPL, pT, pG, pS) => {
  let plGivenObs;

  if (isCorrect) {
    // Step 1: Probability given a CORRECT observation
    const numerator = currentPL * (1 - pS);
    const denominator = numerator + ((1 - currentPL) * pG);
    plGivenObs = numerator / denominator;
  } else {
    // Step 1: Probability given an INCORRECT observation
    const numerator = currentPL * pS;
    const denominator = numerator + ((1 - currentPL) * (1 - pG));
    plGivenObs = numerator / denominator;
  }

  // Step 2: Factor in the Learn Rate P(T)
  const newPL = plGivenObs + ((1 - plGivenObs) * pT);

  return newPL;
};

module.exports = { calculateNewMastery };