
// This file is no longer used and can be deleted.
// Functionality is consolidated into /api/generate-academic-prose/route.ts
// and generateAcademicResponseFlow.
    
export async function POST() {
    return new Response(JSON.stringify({ error: "This endpoint is deprecated. Use /api/generate-academic-prose instead." }), {
        status: 410, // Gone
        headers: { 'Content-Type': 'application/json' },
    });
}
