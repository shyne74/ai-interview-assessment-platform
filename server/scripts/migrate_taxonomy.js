/**
 * Database Taxonomy Migration Script
 * 
 * Normalizes question roles and domains to the canonical taxonomy in server/config/taxonomy.js.
 * Merges questions with identical normalized questionText, keeping the one with the most complete idealAnswer.
 * 
 * Usage:
 *   node scripts/migrate_taxonomy.js            # Default: --dry-run (prints planned changes without altering DB)
 *   node scripts/migrate_taxonomy.js --dry-run  # Explicit dry run
 *   node scripts/migrate_taxonomy.js --apply    # Executes migration and writes report
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Question = require('../models/question_schema');
const {
    ROLES,
    ROLE_DOMAINS,
    canonicalRole,
    canonicalDomain,
    isValidTaxonomy
} = require('../config/taxonomy');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_interview_app_database';

// Normalize text for duplicate detection (lowercase, remove punctuation, collapse whitespace)
function normalizeQuestionText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function runMigration() {
    const isApply = process.argv.includes('--apply');
    const mode = isApply ? 'APPLY' : 'DRY-RUN';

    console.log(`=======================================================`);
    console.log(`  QUESTION BANK TAXONOMY MIGRATION (${mode} MODE)`);
    console.log(`=======================================================`);

    let connection;
    try {
        connection = await mongoose.connect(MONGODB_URI);
        console.log(`Connected to MongoDB: ${MONGODB_URI}\n`);
    } catch (err) {
        console.error(`MongoDB connection failed: ${err.message}`);
        console.log(`Skipping DB operations. Please ensure MongoDB is running to execute against live data.`);
        process.exit(1);
    }

    try {
        const questions = await Question.find({});
        console.log(`Found ${questions.length} total questions in database.\n`);

        const changes = [];
        const duplicatesToMerge = [];
        const seenTexts = new Map(); // normalizedText -> bestQuestion

        // Step 1: Detect taxonomy normalizations and group by normalized text
        for (const q of questions) {
            const originalRole = q.role || '';
            const originalDomain = q.domain || '';
            const newRole = canonicalRole(originalRole);
            const newDomain = canonicalDomain(originalDomain, q.questionText, newRole);

            const roleChanged = originalRole !== newRole;
            const domainChanged = originalDomain !== newDomain;

            if (roleChanged || domainChanged) {
                changes.push({
                    id: q._id.toString(),
                    questionText: q.questionText ? q.questionText.slice(0, 60) + '...' : '(empty)',
                    original: `${originalRole} -> [${originalDomain}]`,
                    canonical: `${newRole} -> [${newDomain}]`
                });
            }

            const normKey = normalizeQuestionText(q.questionText);
            if (normKey.length > 5) {
                if (seenTexts.has(normKey)) {
                    const existing = seenTexts.get(normKey);
                    // Decide which one is more complete
                    const existingAnswerLength = (existing.idealAnswer || '').length;
                    const currentAnswerLength = (q.idealAnswer || '').length;

                    if (currentAnswerLength > existingAnswerLength) {
                        // Current has better answer; merge existing into current
                        duplicatesToMerge.push({
                            keepId: q._id.toString(),
                            mergeId: existing._id.toString(),
                            text: q.questionText.slice(0, 70),
                            keptLength: currentAnswerLength,
                            droppedLength: existingAnswerLength
                        });
                        seenTexts.set(normKey, q);
                    } else {
                        // Existing has better or equal answer; merge current into existing
                        duplicatesToMerge.push({
                            keepId: existing._id.toString(),
                            mergeId: q._id.toString(),
                            text: q.questionText.slice(0, 70),
                            keptLength: existingAnswerLength,
                            droppedLength: currentAnswerLength
                        });
                    }
                } else {
                    seenTexts.set(normKey, q);
                }
            }
        }

        console.log(`[1] Planned Taxonomy Folder Normalizations: ${changes.length}`);
        if (changes.length > 0) {
            console.table(changes.slice(0, 20));
            if (changes.length > 20) {
                console.log(`... and ${changes.length - 20} more normalizations.`);
            }
        }

        console.log(`\n[2] Planned Duplicate Merges: ${duplicatesToMerge.length}`);
        if (duplicatesToMerge.length > 0) {
            console.table(duplicatesToMerge.slice(0, 15));
            if (duplicatesToMerge.length > 15) {
                console.log(`... and ${duplicatesToMerge.length - 15} more duplicates.`);
            }
        }

        // Apply if --apply
        if (isApply) {
            console.log(`\nApplying changes to MongoDB...`);
            let appliedTaxonomyCount = 0;
            let mergedCount = 0;

            for (const q of questions) {
                const newRole = canonicalRole(q.role);
                const newDomain = canonicalDomain(q.domain, q.questionText, newRole);

                if (q.role !== newRole || q.domain !== newDomain) {
                    q.role = newRole;
                    q.domain = newDomain;
                    await q.save();
                    appliedTaxonomyCount++;
                }
            }

            // Deduplicate: remove merged duplicates safely
            for (const dup of duplicatesToMerge) {
                await Question.findByIdAndDelete(dup.mergeId);
                mergedCount++;
            }

            console.log(`Successfully updated ${appliedTaxonomyCount} questions with canonical taxonomy.`);
            console.log(`Successfully merged and removed ${mergedCount} duplicate questions.`);
        } else {
            console.log(`\n>>> DRY RUN COMPLETED. No database records were modified.`);
            console.log(`>>> To execute this migration on the live database, run:`);
            console.log(`    node scripts/migrate_taxonomy.js --apply`);
        }

        // Generate report file
        const reportPath = path.join(__dirname, '../taxonomy_migration_report.json');
        const report = {
            timestamp: new Date().toISOString(),
            mode: mode,
            totalExamined: questions.length,
            normalizationsPlanned: changes.length,
            duplicatesPlanned: duplicatesToMerge.length,
            canonicalRolesCount: ROLES.length,
            changesSample: changes.slice(0, 50),
            duplicatesSample: duplicatesToMerge.slice(0, 50)
        };
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
        console.log(`\nMigration report written to ${reportPath}\n`);

    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    runMigration().catch(err => {
        console.error('Migration error:', err);
        process.exit(1);
    });
}

module.exports = { runMigration, normalizeQuestionText };
