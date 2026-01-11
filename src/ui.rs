use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::Span,
    widgets::{
        canvas::{Canvas, Map, MapResolution},
        Block, Borders, List, ListItem, Paragraph, BorderType, Sparkline,
    },
    Frame,
};
use crate::app::App;
use chrono::Local;

pub fn render(app: &mut App, frame: &mut Frame) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Header
            Constraint::Min(0),    // Content
            Constraint::Length(3), // Footer
        ])
        .split(frame.area());

    render_header(app, frame, chunks[0]);
    render_content(app, frame, chunks[1]);
    render_footer(app, frame, chunks[2]);
}

fn render_header(app: &App, frame: &mut Frame, area: Rect) {
    let time = Local::now().format("%H:%M:%S UTC").to_string();
    let title_text = format!(" {} - CLASSIFIED | {} ", app.title, time);
    
    let title = Paragraph::new(title_text)
        .style(Style::default().fg(Color::Green).add_modifier(Modifier::BOLD))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Thick)
                .border_style(Style::default().fg(Color::Green)),
        )
        .alignment(ratatui::layout::Alignment::Center);
    frame.render_widget(title, area);
}

fn render_content(app: &App, frame: &mut Frame, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(70), // Map
            Constraint::Percentage(30), // Side Panels
        ])
        .split(area);

    render_map(app, frame, chunks[0]);
    render_panels(app, frame, chunks[1]);
}

fn render_map(app: &App, frame: &mut Frame, area: Rect) {
    let map = Canvas::default()
        .block(Block::default().title(" WORLD MAP ").borders(Borders::ALL).border_style(Style::default().fg(Color::Cyan)))
        .x_bounds([-180.0, 180.0])
        .y_bounds([-90.0, 90.0])
        .paint(|ctx| {
            // Draw World Map
            ctx.draw(&Map {
                color: Color::White,
                resolution: MapResolution::High,
            });
            
            // Draw Events
            for (lat, lon, label) in &app.map_events {
                 ctx.print(*lon, *lat, Span::styled("📍", Style::default().fg(Color::Red)));
                 ctx.print(*lon + 2.0, *lat, Span::raw(label.clone()));
            }
        });
    frame.render_widget(map, area);
}

fn render_panels(app: &App, frame: &mut Frame, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage(33),
            Constraint::Percentage(33),
            Constraint::Percentage(34),
        ])
        .split(area);

    render_list_panel(frame, chunks[0], " SPORTS ", &app.sports_data, Color::Yellow);
    render_list_panel(frame, chunks[1], " GEOPOLITICS ", &app.geo_data, Color::Red);
    render_finance_panel(app, frame, chunks[2]);
}

fn render_finance_panel(app: &App, frame: &mut Frame, area: Rect) {
     let block = Block::default().title(" FINANCIAL ").borders(Borders::ALL).border_style(Style::default().fg(Color::Green));
     let inner_area = block.inner(area);
     
     frame.render_widget(block, area);
     
     let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(app.finance_data.len() as u16), 
            Constraint::Min(1),
        ])
        .split(inner_area);
        
    let list_items: Vec<ListItem> = app.finance_data
        .iter()
        .map(|i| ListItem::new(format!("• {}", i)))
        .collect();
    
    let list = List::new(list_items)
        .style(Style::default().fg(Color::White));
        
    frame.render_widget(list, chunks[0]);
    
    let sparkline = Sparkline::default()
        .block(Block::default().title("Trend").borders(Borders::TOP))
        .data(&app.finance_history)
        .style(Style::default().fg(Color::Green));
        
    frame.render_widget(sparkline, chunks[1]);
}

fn render_list_panel(frame: &mut Frame, area: Rect, title: &str, items: &[String], color: Color) {
    let list_items: Vec<ListItem> = items
        .iter()
        .map(|i| ListItem::new(format!("• {}", i)))
        .collect();

    let list = List::new(list_items)
        .block(Block::default().title(title).borders(Borders::ALL).border_style(Style::default().fg(color)))
        .style(Style::default().fg(Color::White));
    
    frame.render_widget(list, area);
}

fn render_footer(_app: &App, frame: &mut Frame, area: Rect) {
    let info = Paragraph::new("Press 'q' to quit | 'r' to refresh data")
        .style(Style::default().fg(Color::Gray))
        .block(Block::default().borders(Borders::TOP));
    frame.render_widget(info, area);
}
