import path from 'node:path';

import {
  fileURLToPath,
} from 'node:url';


const currentDirectory =
  path.dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode:
    true,

  webpack(
    config,
  ) {
    config.resolve.alias[
      'next-intl/config'
    ] = path.resolve(
      currentDirectory,
      'src/i18n/request.ts',
    );

    return config;
  },
};


export default nextConfig;
