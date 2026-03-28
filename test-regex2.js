const text = "Here is the json:\n```json\n{\n \"a\": { \"b\": 1 }\n}\n```\nEnjoy! {smile}";
const start = text.indexOf('{');
const end = text.lastIndexOf('}');
const jsonStr = text.substring(start, end + 1);
console.log(jsonStr);
try { console.log(JSON.parse(jsonStr)); } catch(e) { console.error("Parse failed"); }
