const app = require('./app');
const { syncAdminIdentity } = require('./services/fabricAdmin.service');

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
    await syncAdminIdentity();
});
