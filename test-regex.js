const text = "Here is the json:\n```json\n{\n \"a\": 1\n}\n```\nEnjoy! {smile}";
const match = text.match(/\{.*\}/s);
console.log(match[0]);
try { JSON.parse(match[0]); } catch(e) { console.error("Parse failed"); }
