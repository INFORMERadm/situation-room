use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Span, Line},
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
    
    // Official Comms Renderer
    let items: Vec<ListItem> = app.official_comms.iter().map(|comm| {
        ListItem::new(vec![
            Line::from(Span::raw(comm)),
            Line::default() // spacer
        ])
    }).collect();
    
    let list = List::new(items)
        .block(Block::default().title(" OFFICIAL COMMS ").borders(Borders::ALL).border_style(Style::default().fg(Color::White)));
    
    frame.render_widget(list, chunks[1]);
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

    render_sports_panel(app, frame, chunks[0]);
    render_prediction_panel(app, frame, chunks[1]);
    render_flight_panel(app, frame, chunks[2]);
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
    render_news_panel(app, frame, chunks[1]);
    render_trade_panel(app, frame, chunks[2]);
}

fn render_sports_panel(app: &App, frame: &mut Frame, area: Rect) {
    let items: Vec<ListItem> = app.sports_data.iter().map(|game| {
        let content = Line::from(vec![
            Span::styled(format!("{} | ", game.league), Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::raw(format!("{} ", game.match_up)),
            Span::styled(format!("({})", game.status), Style::default().fg(Color::Gray)),
        ]);
        let score = Line::from(vec![
            Span::raw("  "),
            Span::styled(&game.score, Style::default().fg(Color::White).add_modifier(Modifier::BOLD)),
        ]);
        ListItem::new(vec![content, score, Line::default()])
    }).collect();
    
    let list = List::new(items)
        .block(Block::default().title(" SPORTS ").borders(Borders::ALL).border_style(Style::default().fg(Color::Yellow)));
    frame.render_widget(list, area);
}

fn render_prediction_panel(app: &App, frame: &mut Frame, area: Rect) {
    let items: Vec<ListItem> = app.prediction_data.iter().map(|pred| {
        let content = Line::from(vec![
            Span::styled(format!("{} | ", pred.platform), Style::default().fg(Color::Magenta).add_modifier(Modifier::BOLD)),
            Span::raw(&pred.question),
        ]);
        let odds = Line::from(vec![
            Span::raw("  "),
            Span::styled(&pred.odds, Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)),
        ]);
        ListItem::new(vec![content, odds, Line::default()])
    }).collect();

    let list = List::new(items)
        .block(Block::default().title(" FORECASTS ").borders(Borders::ALL).border_style(Style::default().fg(Color::Magenta)));
    frame.render_widget(list, area);
}

fn render_flight_panel(app: &App, frame: &mut Frame, area: Rect) {
    let items: Vec<ListItem> = app.flight_data.iter().map(|flight| {
        let content = Line::from(vec![
            Span::styled(format!("✈ {} ", flight.callsign), Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)),
            Span::raw(&flight.route),
        ]);
        let status = Line::from(vec![
            Span::raw("  "),
            Span::styled(&flight.status, Style::default().fg(Color::White)),
        ]);
        ListItem::new(vec![content, status, Line::default()])
    }).collect();

    let list = List::new(items)
        .block(Block::default().title(" AVIATION ").borders(Borders::ALL).border_style(Style::default().fg(Color::Cyan)));
    frame.render_widget(list, area);
}

fn render_news_panel(app: &App, frame: &mut Frame, area: Rect) {
    let items: Vec<ListItem> = app.geo_data.iter().map(|news| {
        let header = Line::from(vec![
            Span::styled(format!("📰 {} ", news.source), Style::default().fg(Color::Red).add_modifier(Modifier::BOLD)),
        ]);
        let body = Line::from(Span::raw(&news.headline));
        ListItem::new(vec![header, body, Line::default()])
    }).collect();

    let list = List::new(items)
        .block(Block::default().title(" GLOBAL NEWS ").borders(Borders::ALL).border_style(Style::default().fg(Color::Red)));
    frame.render_widget(list, area);
}

fn render_trade_panel(app: &App, frame: &mut Frame, area: Rect) {
    let items: Vec<ListItem> = app.trade_data.iter().map(|trade| {
        let header = Line::from(vec![
            Span::styled(format!("🚢 {} ", trade.entity), Style::default().fg(Color::Blue).add_modifier(Modifier::BOLD)),
            Span::raw(&trade.location),
        ]);
        let status = Line::from(vec![
             Span::raw("  "),
             Span::styled(&trade.status, Style::default().fg(Color::White)),
        ]);
        ListItem::new(vec![header, status, Line::default()])
    }).collect();

    let list = List::new(items)
        .block(Block::default().title(" LOGISTICS ").borders(Borders::ALL).border_style(Style::default().fg(Color::Blue)));
    frame.render_widget(list, area);
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
            Constraint::Length(app.finance_data.len() as u16 * 2), 
            Constraint::Min(1),
        ])
        .split(inner_area);
        
    let items: Vec<ListItem> = app.finance_data.iter().map(|stock| {
        let color = if stock.change >= 0.0 { Color::Green } else { Color::Red };
        let symbol = if stock.change >= 0.0 { "▲" } else { "▼" };
        
        let line = Line::from(vec![
            Span::styled(format!("{} {} ", symbol, stock.symbol), Style::default().fg(color).add_modifier(Modifier::BOLD)),
            Span::raw(format!("{:.2}", stock.price)),
            Span::styled(format!(" ({:+.1}%)", stock.percent), Style::default().fg(color)),
        ]);
        ListItem::new(vec![line, Line::default()])
    }).collect();
    
    let list = List::new(items)
        .style(Style::default().fg(Color::White));
        
    frame.render_widget(list, chunks[0]);
    
    let sparkline = Sparkline::default()
        .block(Block::default().title("Trend").borders(Borders::TOP))
        .data(&app.finance_history)
        .style(Style::default().fg(Color::Green));
        
    frame.render_widget(sparkline, chunks[1]);
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
