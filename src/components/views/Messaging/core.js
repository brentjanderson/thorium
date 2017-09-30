import React, { Component } from "react";
import gql from "graphql-tag";
import { graphql, withApollo } from "react-apollo";
import { Input } from "reactstrap";
import "./style.scss";

const MESSAGING_SUB = gql`
  subscription GotMessage($simulatorId: ID!) {
    sendMessage(simulatorId: $simulatorId) {
      id
      sender
      content
      timestamp
      simulatorId
      destination
    }
  }
`;

const TEAMS_SUB = gql`
  subscription TeamsUpdate($simulatorId: ID) {
    teamsUpdate(simulatorId: $simulatorId) {
      id
      name
      type
    }
  }
`;

class Messaging extends Component {
  subscription = null;
  teamSub = null;
  state = {
    messageInput: "",
    stationsShown: false,
    selectedConversation: "Security"
  };
  componentWillReceiveProps(nextProps) {
    if (!this.subscription && !nextProps.data.loading) {
      this.subscription = nextProps.data.subscribeToMore({
        document: MESSAGING_SUB,
        variables: {
          simulatorId: nextProps.simulator.id
        },
        updateQuery: (previousResult, { subscriptionData }) => {
          if (!subscriptionData.data.sendMessage) return previousResult;
          setTimeout(this.scrollElement, 100);
          return Object.assign({}, previousResult, {
            messages: previousResult.messages.concat(
              subscriptionData.data.sendMessage
            )
          });
        }
      });
    }
    if (!this.teamSub && !nextProps.data.loading) {
      this.teamSub = nextProps.data.subscribeToMore({
        document: TEAMS_SUB,
        variables: {
          simulatorId: nextProps.simulator.id
        },
        updateQuery: (previousResult, { subscriptionData }) => {
          return Object.assign({}, previousResult, {
            teams: subscriptionData.data.teamsUpdate
          });
        }
      });
    }
  }
  componentWillUnmount() {
    this.subscription();
    this.teamSub();
  }
  sendMessage = () => {
    const mutation = gql`
      mutation SendMessage($message: MessageInput!) {
        sendMessage(message: $message)
      }
    `;
    const { messageInput, selectedConversation } = this.state;
    const variables = {
      message: {
        simulatorId: this.props.simulator.id,
        destination: selectedConversation,
        sender: selectedConversation,
        content: messageInput
      }
    };
    this.props.client.mutate({
      mutation,
      variables
    });
    this.setState({ messageInput: "" });
  };
  toggleStations = () => {
    this.setState({
      stationsShown: !this.state.stationsShown
    });
  };
  render() {
    if (this.props.data.loading) return null;
    const { messages, teams } = this.props.data;
    const { messageInput, selectedConversation } = this.state;

    const messageGroups = ["Security", "Damage", "Medical"];
    return (
      <div className="core-messaging">
        <Input
          size="sm"
          type="select"
          onChange={evt =>
            this.setState({ selectedConversation: evt.target.value })}
          value={selectedConversation}
        >
          {messageGroups.map(g =>
            <option key={g} value={g}>
              {g}
            </option>
          )}
          <option disabled>-------------</option>
          {teams &&
            teams
              .filter(
                t =>
                  messageGroups.findIndex(
                    m => m.toLowerCase() === t.type.toLowerCase()
                  ) > -1
              )
              .map(g =>
                <option key={g.name} value={g.name}>
                  {g.name} - {g.type}
                </option>
              )}
        </Input>
        <div className="message-list">
          {messages
            .filter(
              m =>
                m.sender === selectedConversation ||
                m.destination === selectedConversation
            )
            .reverse()
            .map(m =>
              <p
                key={m.id}
                className={m.sender === selectedConversation ? "sender" : ""}
              >
                {m.sender === selectedConversation ? m.destination : m.sender} -{" "}
                {m.content}
              </p>
            )}
        </div>
        <form action="javascript:" onSubmit={this.sendMessage}>
          <Input
            size="sm"
            type="text"
            value={messageInput}
            onChange={evt => this.setState({ messageInput: evt.target.value })}
          />
        </form>
      </div>
    );
  }
}

const MESSAGING_QUERY = gql`
  query Messages($simulatorId: ID!) {
    messages(simulatorId: $simulatorId) {
      id
      sender
      content
      timestamp
      simulatorId
      destination
    }
    teams(simulatorId: $simulatorId) {
      id
      name
      type
    }
  }
`;
export default graphql(MESSAGING_QUERY, {
  options: ownProps => ({
    variables: {
      simulatorId: ownProps.simulator.id
    }
  })
})(withApollo(Messaging));