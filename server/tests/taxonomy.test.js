const test = require('node:test');
const assert = require('node:assert/strict');
const {
    ROLES,
    ROLE_DOMAINS,
    canonicalRole,
    canonicalDomain,
    isValidTaxonomy
} = require('../config/taxonomy');
const { normalizeQuestionText } = require('../scripts/migrate_taxonomy');

test('Taxonomy Canonical Roles', async (t) => {
    await t.test('maps Backend variations correctly', () => {
        assert.equal(canonicalRole('backend engineer'), 'Backend Developer');
        assert.equal(canonicalRole('backend dev'), 'Backend Developer');
        assert.equal(canonicalRole('BACKEND DEVELOPER'), 'Backend Developer');
    });

    await t.test('maps Software Developer to Software Engineer', () => {
        assert.equal(canonicalRole('software developer'), 'Software Engineer');
        assert.equal(canonicalRole('swe'), 'Software Engineer');
        assert.equal(canonicalRole('coding'), 'Software Engineer');
    });

    await t.test('maps Full Stack and DevOps variations', () => {
        assert.equal(canonicalRole('fullstack developer'), 'Full Stack Developer');
        assert.equal(canonicalRole('devops'), 'DevOps Engineer');
        assert.equal(canonicalRole('cloud'), 'Cloud Engineer');
    });

    await t.test('defaults unknown role safely to Software Engineer', () => {
        assert.equal(canonicalRole('unknown role 123'), 'Software Engineer');
    });
});

test('Taxonomy Canonical Domains per Role', async (t) => {
    await t.test('resolves Backend domains without overlap', () => {
        assert.equal(canonicalDomain('node', '', 'Backend Developer'), 'Node.js & Express');
        assert.equal(canonicalDomain('express.js', '', 'Backend Developer'), 'Node.js & Express');
        assert.equal(canonicalDomain('database', '', 'Backend Developer'), 'Databases & Storage');
        assert.equal(canonicalDomain('mongodb', '', 'Backend Developer'), 'Databases & Storage');
    });

    await t.test('resolves Software Engineer domains', () => {
        assert.equal(canonicalDomain('algorithms', '', 'Software Engineer'), 'Algorithms');
        assert.equal(canonicalDomain('algorithms (112)', '', 'Software Engineer'), 'Algorithms');
        assert.equal(canonicalDomain('data structures', '', 'Software Engineer'), 'Data Structures');
        assert.equal(canonicalDomain('python', '', 'Software Engineer'), 'Python');
    });

    await t.test('removes single-question parentheticals like Database (1)', () => {
        const dom = canonicalDomain('Database (1)', '', 'Backend Developer');
        assert.equal(dom, 'Databases & Storage');
    });

    await t.test('resolves multi-topic comma strings in Philosophy', () => {
        const lockeDom = canonicalDomain('Locke, Tabula Rasa, Empiricism', 'John Locke epistemology', 'Philosophy');
        assert.equal(lockeDom, 'Epistemology & Empiricism');

        const putnamDom = canonicalDomain('Philosophy of language, Putnam', 'Twin Earth semantic externalism', 'Philosophy');
        assert.equal(putnamDom, 'Philosophy of Language & Semantics');
    });

    await t.test('validates taxonomy strictly', () => {
        assert.equal(isValidTaxonomy('Backend Developer', 'Node.js & Express'), true);
        assert.equal(isValidTaxonomy('Backend Developer', 'Invalid Subdomain'), false);
        assert.equal(isValidTaxonomy('Nonexistent Role', 'Algorithms'), false);
    });
});

test('Taxonomy Text Normalizer for Merging', async (t) => {
    await t.test('strips punctuation, case, and extra whitespace', () => {
        const t1 = 'Explain the difference between SQL and NoSQL databases!';
        const t2 = 'explain the difference between sql and nosql databases.';
        assert.equal(normalizeQuestionText(t1), normalizeQuestionText(t2));
    });
});
