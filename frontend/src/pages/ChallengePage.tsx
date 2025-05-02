import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Grid, Paper, Typography } from '@mui/material';
import { Terminal } from '../components/Terminal';
import { CodeEditor } from '../components/CodeEditor';
import { fetchChallenge } from '../store/slices/challengesSlice';
import { RootState, AppDispatch } from '../store';

export const ChallengePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const challenge = useSelector((state: RootState) => state.challenges.current);
  const terminal = useSelector((state: RootState) => state.terminal.current);

  useEffect(() => {
    if (id) {
      dispatch(fetchChallenge(parseInt(id)));
    }
  }, [id, dispatch]);

  if (!challenge) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="xl">
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h4">{challenge.title}</Typography>
          <Typography variant="subtitle1">
            Difficulty: {challenge.difficulty} | Points: {challenge.points}
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6">Description</Typography>
            <Typography>{challenge.description}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ height: '400px' }}>
            {terminal && <Terminal sessionId={terminal.id} />}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={3} sx={{ height: '300px' }}>
            <CodeEditor
              language="python"
              value={challenge.initialCode || ''}
              onChange={() => {}}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};