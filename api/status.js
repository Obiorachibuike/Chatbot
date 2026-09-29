module.exports = (req, res) => {
  res.status(200).json({
    configured: !!(process.env.AI_API_KEY || process.env.OPENAI_API_KEY),
    model: process.env.AI_MODEL || "gpt-4o-mini",
  });
};
