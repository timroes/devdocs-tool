import React from 'react';
import ReactDOM from 'react-dom';
import compareVersions from 'compare-versions';
import {
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiSelect
} from '@elastic/eui';

import '@elastic/eui/dist/eui_theme_light.css';
import './styles.css';

const DEV_DOC_LABEL = 'release_note:dev_docs';
const VERSIONS = ['v6.5.0', 'v6.6.0', 'v6.7.0', 'v7.0.0'];
const SEMVER_REGEX = /^v(\d+)\.(\d+)\.(\d+)$/;
const DEVDOC_REGEX = /# Dev[- ]?Docs?\s+([\S\s]*)/i;

class App extends React.Component {
  state = {
    issues: []
  };

  async loadIssues(version) {
    const url = `https://api.github.com/search/issues?q=repo:elastic/kibana%20label:${DEV_DOC_LABEL}%20label:${version}`;
    const items = await fetch(url).then(response => response.json());
    return items.items.filter(issue => {
      const versions = issue.labels
        .filter(label => label.name.match(SEMVER_REGEX))
        .map(label => label.name);
      // Check if there is any version label below the one we are looking for
      // which would mean this PR has already been released (and blogged about)
      // in an earlier dev documentation blog post.
      return !versions.some(
        verLabel => compareVersions(version, verLabel) === 1
      );
    });
  }

  selectVersion = async ev => {
    const version = ev.target.value;
    const rawIssues = await this.loadIssues(version);
    const issues = rawIssues.map(issue => {
      const devDocSection = DEVDOC_REGEX.exec(issue.body);
      return {
        pr: issue.number,
        title: issue.title,
        text: devDocSection && devDocSection[1]
      };
    });
    this.setState({ issues });
  };

  renderIssue = (issue, index) => {
    return (
      `${index > 0 ? '\n\n' : ''}` +
      `${issue.text}\n\n` +
      `*via [#${issue.pr}](https://github.com/elastic/kibana/pull/${issue.pr})*`
    );
  };

  renderBrokenIssues(brokenIssues) {
    return (
      <EuiFlexItem grow={false}>
        <EuiCallOut color="danger" title="Missing Dev Doc description">
          <p>
            The following PRs where labeled, but haven't had a Dev Doc section:
          </p>
          <ul>
            {brokenIssues.map(issue => (
              <li key={issue.pr}>
                <a href={`https://github.com/elastic/kibana/pull/${issue.pr}`}>
                  #{issue.pr}
                </a>
                <span> {issue.title}</span>
              </li>
            ))}
          </ul>
        </EuiCallOut>
      </EuiFlexItem>
    );
  }

  renderNoIssues() {
    return (
      <EuiEmptyPrompt
        iconType="faceHappy"
        title={<h2>No API changes</h2>}
        body={
          <React.Fragment>
            <p>
              No issue have yet been labeled as API breaking for the selected
              version.
            </p>
            <p>
              To add content to the dev docs, attach the{' '}
              <EuiCode>{DEV_DOC_LABEL}</EuiCode>
              label to a PR or issue and add the content, that should be added
              to the dev docs behind a <EuiCode># Dev Docs</EuiCode> header in
              the issue description.
            </p>
          </React.Fragment>
        }
      />
    );
  }

  render() {
    const versionOptions = [
      { value: '', text: 'Select version', disabled: true },
      ...VERSIONS.map(ver => ({ text: ver, value: ver }))
    ];

    const brokenIssues = this.state.issues.filter(issue => !issue.text);

    return (
      <EuiPage className="App">
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiSelect options={versionOptions} onChange={this.selectVersion} />
          </EuiFlexItem>
          {brokenIssues.length > 0 && this.renderBrokenIssues(brokenIssues)}
          {this.state.issues.length === 0 && this.renderNoIssues()}
          {this.state.issues.length > 0 && (
            <EuiFlexItem>
              <EuiCodeBlock
                className="App__markdown"
                fontSize="m"
                color="dark"
                paddingSize="s"
              >
                {this.state.issues
                  .filter(issue => issue.text)
                  .map(this.renderIssue)}
              </EuiCodeBlock>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPage>
    );
  }
}

const rootElement = document.getElementById('root');
ReactDOM.render(<App />, rootElement);
