# raesum

This is a starting point to build an API sever. It is the result of the recurring problem of needing to build key foundational components yet still have a heavily customizable system.

# System Requirements

* Node (Currently tested against 18.x)
* PSQL
* Optional: Redis

# How to Use

- [Configuration Options](/documentation/configurationOptions.md)

# Principles

1. The purpose of this starter is to build an API server.
2. Clarity is better than brevity.
3. Simple and low-tech is preferable to sophisticated.
4. Authorization management shall be a first class citizen.
5. Security and deployment considerations are core design.
6. The developer shall not be insulated from contact with the data and the requests.
7. This codebase will hold strong opinions about non-core features *ONLY* (features that are not related to the developer's primary goals).
8. There will be no additional software requirements that cannot satisfied by running ```npm install```.
9. The layout and code structure shall be readable and usable by MID-LEVEL developers and understandable to JUNIOR-LEVEL developers.
10. Data that is useful in the database but does not need to be changed outside of releases shall be included in the codebase.
11. This system will assume the use of AWS for uploads and secrets management
