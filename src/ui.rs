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
use crate::app::{App, EventCategory};
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
    let title_text = format!(" {} | {} ", app.title, time);
    
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
    // 3 Columns: Left Panels, Center (Map + New Panels), Right Panels
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(20), // Left
            Constraint::Percentage(60), // Center
            Constraint::Percentage(20), // Right
        ])
        .split(area);

    render_left_panel(app, frame, chunks[0]);
    render_center_panel(app, frame, chunks[1]);
    render_right_panel(app, frame, chunks[2]);
}

fn render_center_panel(app: &App, frame: &mut Frame, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage(70), // Map
            Constraint::Percentage(30), // Bottom Info (Pizza + Comms)
        ])
        .split(area);
        
    render_map(app, frame, chunks[0]);
    render_bottom_info(app, frame, chunks[1]);
}

fn render_bottom_info(app: &App, frame: &mut Frame, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(50),
            Constraint::Percentage(50),
        ])
        .split(area);

    render_pizza_meter(app, frame, chunks[0]);
    render_list_panel(frame, chunks[1], " OFFICIAL COMMS ", &app.official_comms, Color::White);
}

fn render_pizza_meter(app: &App, frame: &mut Frame, area: Rect) {
    // Visualize Pizza Index as a Gauge
    use ratatui::widgets::Gauge;
    
    let block = Block::default()
        .title(" PENTAGON PIZZA INDEX ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Yellow));
    
    // Determine color based on index
    let color = match app.pizza_meter {
        0..=30 => Color::Green,
        31..=70 => Color::Yellow,
        _ => Color::Red,
    };
    
    let label = format!("{}% (Baseline Normal)", app.pizza_meter);
    
    let gauge = Gauge::default()
        .block(block)
        .gauge_style(Style::default().fg(color))
        .percent(app.pizza_meter as u16)
        .label(label);
        
    frame.render_widget(gauge, area);
}

fn render_left_panel(app: &App, frame: &mut Frame, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage(33),
            Constraint::Percentage(33),
            Constraint::Percentage(34),
        ])
        .split(area);

    render_list_panel(frame, chunks[0], " SPORTS ", &app.sports_data, Color::Yellow);
    render_list_panel(frame, chunks[1], " FORECASTS ", &app.prediction_data, Color::Magenta);
    render_list_panel(frame, chunks[2], " AVIATION ", &app.flight_data, Color::Cyan);
}

fn render_right_panel(app: &App, frame: &mut Frame, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage(33),
            Constraint::Percentage(33),
            Constraint::Percentage(34),
        ])
        .split(area);

    render_finance_panel(app, frame, chunks[0]);
    render_list_panel(frame, chunks[1], " GLOBAL NEWS ", &app.geo_data, Color::Red);
    render_list_panel(frame, chunks[2], " LOGISTICS ", &app.trade_data, Color::Blue);
}

fn render_map(app: &App, frame: &mut Frame, area: Rect) {
    let map = Canvas::default()
        .block(Block::default().title(" GLOBAL VIEW ").borders(Borders::ALL).border_style(Style::default().fg(Color::Cyan)))
        .x_bounds([-180.0, 180.0])
        .y_bounds([-90.0, 90.0])
        .paint(|ctx| {
            // Draw World Map
            ctx.draw(&Map {
                color: Color::White,
                resolution: MapResolution::High,
            });
            
            // Draw Events
            for event in &app.map_events {
                 let (symbol, color) = match event.category {
                     EventCategory::Geopolitics => ("📍", Color::Red),
                     EventCategory::News => ("📰", Color::Yellow),
                     EventCategory::Sports => ("🏀", Color::Magenta),
                     EventCategory::Flight => ("✈", Color::Cyan),
                     EventCategory::Trade => ("🚢", Color::Blue),
                 };
                 
                 ctx.print(event.lon, event.lat, Span::styled(symbol, Style::default().fg(color)));
                 // Only show text if zoomed in or sparse? For now just show it.
                 // Offset text slightly
                 ctx.print(event.lon + 2.0, event.lat, Span::raw(event.description.clone()));
            }
        });
    frame.render_widget(map, area);
}

fn render_finance_panel(app: &App, frame: &mut Frame, area: Rect) {
     let block = Block::default().title(" MARKETS ").borders(Borders::ALL).border_style(Style::default().fg(Color::Green));
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

fn render_footer(app: &App, frame: &mut Frame, area: Rect) {
    let music_status = if app.spotify.is_playing { "▶" } else { "⏸" };
    let music_info = format!(
        " NOW PLAYING: {} {} - {} ", 
        music_status, 
        app.spotify.current_track, 
        app.spotify.current_artist
    );

    let info_text = " [Q] Quit | [SPACE] Play/Pause | [N] Next | [?] Help | v1.3.0 ";
    
    let layout = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Min(0),
            Constraint::Length(info_text.len() as u16 + 2),
        ])
        .split(area);

    let music = Paragraph::new(music_info)
        .style(Style::default().fg(Color::Green))
        .block(Block::default().borders(Borders::TOP));
        
    let controls = Paragraph::new(info_text)
        .style(Style::default().fg(Color::Gray))
        .block(Block::default().borders(Borders::TOP))
        .alignment(ratatui::layout::Alignment::Right);

    frame.render_widget(music, layout[0]);
    frame.render_widget(controls, layout[1]);
}
