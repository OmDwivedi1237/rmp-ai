
"use client"

import { useState } from 'react';
import { Box, Button, TextField, Stack } from '@mui/material';

export default function Home() {
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');

  // Function to handle sending messages
  const sendMessage = async () => {
    setMessage('');
    // Existing message handling code
  };

  // Function to handle link submission
  const handleLinkSubmit = async () => {
    try {
      const response = await fetch('/api/submit-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const result = await response.json();
      console.log('Link submission result:', result);
    } catch (error) {
      console.error('Error submitting link:', error);
    }
  };

  return (
    <Box width="100vw" height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center" bgcolor="#000000">
      <Stack direction="column" width="500px" height="700px" border="1px solid #ffffff" p={2} spacing={3} bgcolor="#000000">
        {/* Existing UI components for chat */}
        <Stack direction="row" spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            variant="outlined"
            sx={{ input: { color: '#ffffff' }, fieldset: { borderColor: '#ffffff' } }}
          />
          <Button variant="contained" onClick={sendMessage} sx={{ backgroundColor: '#333333', '&:hover': { backgroundColor: '#555555' } }}>
            Send
          </Button>
        </Stack>
        
        {/* New UI components for link submission */}
        <Stack direction="row" spacing={2} mt={3}>
          <TextField
            label="Professor Link"
            fullWidth
            value={link}
            onChange={(e) => setLink(e.target.value)}
            variant="outlined"
            sx={{ input: { color: '#ffffff' }, fieldset: { borderColor: '#ffffff' } }}
          />
          <Button variant="contained" onClick={handleLinkSubmit} sx={{ backgroundColor: '#333333', '&:hover': { backgroundColor: '#555555' } }}>
            Submit Link
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
