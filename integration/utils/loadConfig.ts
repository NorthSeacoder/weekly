import fs from 'node:fs';
import {load as loadYaml} from 'js-yaml';

const loadConfig = async (configPathOrData: string | object) => {
  if (typeof configPathOrData === 'string') {
    const content = fs.readFileSync(configPathOrData, 'utf8');
    if (configPathOrData.endsWith('.yaml') || configPathOrData.endsWith('.yml')) {
      return loadYaml(content);
    }
    return content;
  }

  return configPathOrData;
};

export default loadConfig;
