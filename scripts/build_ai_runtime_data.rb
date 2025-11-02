#!/usr/bin/env ruby
# frozen_string_literal: true

require 'yaml'
require 'json'
require 'date'

SOURCE_PATH = File.expand_path(
  '~/Downloads/benchmark_results_aicodingtasks.yaml'
).freeze
OUTPUT_PATH = File.expand_path(
  '../assets/data/ai-runtime.json', __dir__
).freeze

TOKEN_REPLACEMENTS = {
  'gpt' => 'GPT',
  'gpt2' => 'GPT-2',
  'gpt3' => 'GPT-3',
  'gpt4' => 'GPT-4',
  'gpt-oss' => 'GPT-OSS',
  'gpt-4o' => 'GPT-4o',
  'gpt-4' => 'GPT-4',
  'gpt-4o-mini' => 'GPT-4o Mini',
  'claude' => 'Claude',
  'sonnet' => 'Sonnet',
  'opus' => 'Opus',
  'davinci' => 'Davinci',
  'turbo' => 'Turbo',
  'deepseek' => 'DeepSeek',
  'gemini' => 'Gemini',
  'mini' => 'Mini',
  'preview' => 'Preview',
  'qwen' => 'Qwen',
  'grok' => 'Grok',
  'o1' => 'o1',
  'o3' => 'o3',
  'o4' => 'o4',
  'r1' => 'R1',
  'v3' => 'V3',
  'pro' => 'Pro',
  'alpha' => 'Alpha'
}.freeze

def prettify_model_key(key)
  tokens = key.split('_')
  tokens.map do |token|
    TOKEN_REPLACEMENTS[token] ||
      token.gsub(/\A[[:alpha:]]/) { |char| char.upcase }
  end.join(' ')
end

def load_entries
  data = YAML.load_file(SOURCE_PATH)
  results = data.fetch('results', {})

  results.each_with_object([]) do |(model_key, payload), acc|
    release_date = payload['release_date']
    next unless release_date
    release_date = release_date.to_s

    agent_data = payload.dig('agents', 'modular-public')
    next unless agent_data.is_a?(Hash)

    metrics = {}

    {
      'p50_horizon_length' => 'p50',
      'p80_horizon_length' => 'p80'
    }.each do |metric_key, label|
      metric_payload = agent_data[metric_key]
      next unless metric_payload.is_a?(Hash) && metric_payload['estimate']

      metrics[label] = {
        estimate: metric_payload['estimate'].to_f,
        ciLow: metric_payload['ci_low'] && metric_payload['ci_low'].to_f,
        ciHigh: metric_payload['ci_high'] && metric_payload['ci_high'].to_f
      }
    end

    next if metrics.empty?

    acc << {
      model: prettify_model_key(model_key),
      rawModel: model_key,
      releaseDate: release_date,
      series: 'historical',
      metrics: metrics
    }
  end.sort_by { |entry| Date.parse(entry[:releaseDate]) }
end

def add_forecast_points(entries, horizon_months: 7, forecast_until: Date.new(2027, 12, 31))
  last_p50_entry = entries.reverse.find { |entry| entry[:metrics].key?('p50') }
  last_p80_entry = entries.reverse.find { |entry| entry[:metrics].key?('p80') }

  return entries unless last_p50_entry

  current_date = Date.parse(last_p50_entry[:releaseDate])
  current_p50 = last_p50_entry[:metrics]['p50'][:estimate]
  current_p80 = last_p80_entry && last_p80_entry[:metrics]['p80'][:estimate]

  while current_date < forecast_until
    current_date = current_date >> horizon_months
    break if current_date > forecast_until

    current_p50 *= 2 if current_p50
    current_p80 *= 2 if current_p80

    metrics = {}
    metrics['p50'] = { estimate: current_p50 } if current_p50
    metrics['p80'] = { estimate: current_p80 } if current_p80

    entries << {
      model: "Forecast #{current_date.strftime('%b %Y')}",
      rawModel: "forecast_#{current_date.strftime('%Y%m')}",
      releaseDate: current_date.strftime('%Y-%m-%d'),
      series: 'forecast',
      metrics: metrics
    }
  end

  entries.sort_by { |entry| Date.parse(entry[:releaseDate]) }
end

def build_dataset
  entries = load_entries
  add_forecast_points(entries)
end

def write_dataset
  dataset = build_dataset
  File.write(OUTPUT_PATH, JSON.pretty_generate(dataset))
  warn "Wrote #{dataset.size} records to #{OUTPUT_PATH}"
end

write_dataset if $PROGRAM_NAME == __FILE__
