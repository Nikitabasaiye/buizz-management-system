const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const cache = new Map();

async function getParameter(name) {
  if (cache.has(name)) return cache.get(name);
  const cmd = new GetParameterCommand({ Name: name, WithDecryption: true });
  const res = await ssmClient.send(cmd);
  const value = res.Parameter ? res.Parameter.Value : null;
  cache.set(name, value);
  return value;
}

async function getParameters(names = []) {
  const results = {};
  for (const name of names) {
    results[name] = await getParameter(name);
  }
  return results;
}

module.exports = {
  getParameter,
  getParameters,
};
