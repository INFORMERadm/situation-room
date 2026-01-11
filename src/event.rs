use crossterm::event::{Event as CrosstermEvent, KeyEvent, MouseEvent};
use std::time::Duration;
use tokio::sync::mpsc;

#[derive(Clone, Copy, Debug)]
pub enum Event {
    Tick,
    Key(KeyEvent),
    Mouse(MouseEvent),
    Resize(u16, u16),
}

#[derive(Debug)]
pub struct EventHandler {
    receiver: mpsc::UnboundedReceiver<Event>,
    // task: tokio::task::JoinHandle<()>, // Kept for cleanup if needed later
}

impl EventHandler {
    pub fn new(tick_rate: Duration) -> Self {
        let (sender, receiver) = mpsc::unbounded_channel();
        let _sender = sender.clone();
        
        let _task = tokio::spawn(async move {
            let mut reader = crossterm::event::EventStream::new();
            let mut interval = tokio::time::interval(tick_rate);
            
            loop {
                let tick_delay = interval.tick();
                
                tokio::select! {
                    _ = tick_delay => {
                        _sender.send(Event::Tick).unwrap();
                    }
                    Some(Ok(evt)) = reader.next() => {
                        match evt {
                            CrosstermEvent::Key(key) => {
                                if key.kind == crossterm::event::KeyEventKind::Press {
                                    _sender.send(Event::Key(key)).unwrap();
                                }
                            }
                            CrosstermEvent::Mouse(mouse) => {
                                _sender.send(Event::Mouse(mouse)).unwrap();
                            }
                            CrosstermEvent::Resize(w, h) => {
                                _sender.send(Event::Resize(w, h)).unwrap();
                            }
                            _ => {}
                        }
                    }
                }
            }
        });

        Self {
            receiver,
            // task,
        }
    }

    pub async fn next(&mut self) -> Option<Event> {
        self.receiver.recv().await
    }
}

// Helper trait to use Stream with tokio
use futures::StreamExt;
