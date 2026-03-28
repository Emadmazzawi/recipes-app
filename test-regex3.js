const text = "Here is the json:\n```json\n{\n \"a\": { \"b\": 1 }\n}\n```\nEnjoy! {smile}";
const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
if (match) {
  console.log("Matched block:", match[1]);
  console.log(JSON.parse(match[1]));
} else {
  // Fallback to first { to last } as best effort if no code block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  console.log(text.substring(start, end + 1));
}
