const test = require('node:test');
const assert = require('node:assert/strict');
const { authorize } = require('../middleware/authmiddleware');

test('RBAC Middleware: Candidate vs Admin 403 enforcement', async (t) => {
    await t.test('blocks candidate user from accessing admin-only routes with 403', () => {
        const req = {
            user: {
                _id: 'candidate_123',
                role: 'candidate',
                username: 'candidate_test'
            }
        };

        let statusCode = null;
        let responseJson = null;

        const res = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => {
                        responseJson = data;
                    }
                };
            }
        };

        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };

        const adminMiddleware = authorize('admin');
        adminMiddleware(req, res, next);

        assert.equal(statusCode, 403);
        assert.equal(nextCalled, false);
        assert.ok(responseJson.message.includes('not authorized'));
    });

    await t.test('allows admin user to proceed to next() handler', () => {
        const req = {
            user: {
                _id: 'admin_456',
                role: 'admin',
                username: 'admin_super'
            }
        };

        const res = {};
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };

        const adminMiddleware = authorize('admin');
        adminMiddleware(req, res, next);

        assert.equal(nextCalled, true);
    });

    await t.test('blocks unauthenticated request with 401', () => {
        const req = {}; // No req.user attached
        let statusCode = null;
        let responseJson = null;

        const res = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => {
                        responseJson = data;
                    }
                };
            }
        };

        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };

        const adminMiddleware = authorize('admin');
        adminMiddleware(req, res, next);

        assert.equal(statusCode, 401);
        assert.equal(nextCalled, false);
        assert.equal(responseJson.message, 'User not authenticated');
    });
});
