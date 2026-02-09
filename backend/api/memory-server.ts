// Express server for agent memory file access
import express from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getSupabaseClient } from '../supabase/client';
import cors from 'cors';

const app = express();
const PORT = process.env.MEMORY_API_PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to get agent workspace path from agent ID
async function getAgentWorkspacePath(agentId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  
  const { data: agent, error } = await supabase
    .from('agents')
    .select('name')
    .eq('id', agentId)
    .single();
  
  if (error || !agent) {
    return null;
  }
  
  // Convert agent name to lowercase for directory name
  const agentName = agent.name.toLowerCase();
  return path.join(process.cwd(), 'workspace', 'agents', agentName);
}

// Get memory file content
app.get('/api/agents/:agentId/memory/:fileType', async (req, res) => {
  try {
    const { agentId, fileType } = req.params;
    
    // Validate file type
    if (!['WORKING', 'MEMORY'].includes(fileType) && !fileType.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    const workspacePath = await getAgentWorkspacePath(agentId);
    if (!workspacePath) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const fileName = fileType === 'WORKING' ? 'WORKING.md' : 
                     fileType === 'MEMORY' ? 'MEMORY.md' : 
                     `${fileType}.md`;
    
    const filePath = path.join(workspacePath, 'memory', fileName);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      res.json({ content });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        res.json({ content: '' }); // Return empty string if file doesn't exist
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Error reading memory file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update memory file content
app.put('/api/agents/:agentId/memory/:fileType', async (req, res) => {
  try {
    const { agentId, fileType } = req.params;
    const { content } = req.body;
    
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }
    
    // Validate file type
    if (!['WORKING', 'MEMORY'].includes(fileType) && !fileType.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    const workspacePath = await getAgentWorkspacePath(agentId);
    if (!workspacePath) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const fileName = fileType === 'WORKING' ? 'WORKING.md' : 
                     fileType === 'MEMORY' ? 'MEMORY.md' : 
                     `${fileType}.md`;
    
    const filePath = path.join(workspacePath, 'memory', fileName);
    const memoryDir = path.dirname(filePath);
    
    // Ensure memory directory exists
    await fs.mkdir(memoryDir, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, content, 'utf-8');
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error writing memory file:', error);
    res.status(500).json({ error: error.message });
  }
});

// List daily note files
app.get('/api/agents/:agentId/memory/daily-notes', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const workspacePath = await getAgentWorkspacePath(agentId);
    if (!workspacePath) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const memoryDir = path.join(workspacePath, 'memory');
    
    try {
      const files = await fs.readdir(memoryDir);
      const dailyNotes = files
        .filter(file => file.match(/^\d{4}-\d{2}-\d{2}\.md$/))
        .sort()
        .reverse(); // Most recent first
      
      res.json({ files: dailyNotes });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        res.json({ files: [] });
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Error listing daily notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server - always start when file is executed
app.listen(PORT, () => {
  console.log(`Memory API server running on http://localhost:${PORT}`);
  console.log(`Access memory files at: http://localhost:${PORT}/api/agents/:agentId/memory/:fileType`);
});

export default app;
