// Loads server/.env no matter which folder the command is run from
// (root se `npm run db:migrate` chalane par cwd = root hota hai).
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
