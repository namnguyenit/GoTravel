const path = require('node:path');

const root = path.resolve(__dirname, '..');
const node = '/home/nhan/.nodejs-22/bin/node';
const inProject = (directory) => path.join(root, directory);

const javaService = (name, module) => ({
  name,
  script: inProject('deploy/start-java-service.sh'),
  args: [module],
  cwd: root,
  interpreter: '/bin/bash',
  restart_delay: 5000,
});

module.exports = {
  apps: [
    {
      name: 'gotravel-tunnel',
      script: '/home/nhan/bin/cloudflared',
      args: ['tunnel', '--no-autoupdate', 'run', '--token-file', '/home/nhan/.config/gotravel-cloudflared/tunnel-token'],
      cwd: root,
      interpreter: 'none',
      restart_delay: 5000,
    },
    {
      name: 'gocar-service',
      script: node,
      args: ['--max-old-space-size=160', 'dist/main.js'],
      cwd: inProject('car'),
      interpreter: 'none',
      restart_delay: 5000,
    },
    {
      name: 'gostay-frontend',
      script: '/home/nhan/.nodejs-22/bin/npm',
      args: ['run', 'start', '--', '--hostname', '127.0.0.1', '--port', '3000'],
      cwd: inProject('front_end'),
      interpreter: node,
      env: { NODE_ENV: 'production', NEXT_BUILD_DIR: '.next' },
      restart_delay: 5000,
    },
    javaService('gostay-identity', 'identity'),
    {
      name: 'gostay-gateway',
      script: inProject('APIGateway/server.js'),
      cwd: inProject('APIGateway'),
      interpreter: node,
      restart_delay: 5000,
    },
    javaService('gostay-catalog', 'catalog'),
    javaService('gostay-booking', 'booking'),
    javaService('gostay-cart', 'cart'),
    javaService('gostay-payment', 'payment'),
    {
      name: 'gostay-search',
      script: inProject('search-and-recommendation/dist/main.js'),
      cwd: inProject('search-and-recommendation'),
      interpreter: node,
      restart_delay: 5000,
    },
    {
      name: 'gostay-media',
      script: inProject('cloudinary-service/src/media-server.js'),
      cwd: inProject('cloudinary-service'),
      interpreter: node,
      restart_delay: 5000,
    },
    {
      name: 'gostay-payment-portal',
      script: inProject('payment_portal/server.js'),
      cwd: inProject('payment_portal'),
      interpreter: node,
      restart_delay: 5000,
    },
    {
      name: 'gocar-frontend',
      script: inProject('car_front-end/node_modules/vite/bin/vite.js'),
      args: ['preview', '--outDir', 'dist', '--port', '3334', '--host', '127.0.0.1', '--strictPort'],
      cwd: inProject('car_front-end'),
      interpreter: node,
      env: { NODE_ENV: 'production' },
      restart_delay: 5000,
    },
    {
      name: 'auth-frontend',
      script: inProject('auth_front-end/node_modules/vite/bin/vite.js'),
      args: ['preview', '--outDir', 'dist', '--port', '3335', '--host', '127.0.0.1', '--strictPort'],
      cwd: inProject('auth_front-end'),
      interpreter: node,
      env: { NODE_ENV: 'production' },
      restart_delay: 5000,
    },
  ],
};
